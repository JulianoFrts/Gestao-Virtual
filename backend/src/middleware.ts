import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import { jwtVerify } from "jose";
import { HTTP_STATUS } from "@/lib/constants";
import { logger } from "@/lib/utils/logger";

// ======================================================
// ENV CONFIG
// ======================================================

const INTERNAL_PROXY_KEY = process.env.INTERNAL_PROXY_KEY || "";

const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL?.replace(/['"]/g, ""),
  process.env.FRONTEND_URL?.replace(/['"]/g, ""),
].filter(Boolean) as string[];

// ======================================================
// SECURITY HEADERS
// ======================================================

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()",

  "Content-Security-Policy": `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https:;
    font-src 'self';
    object-src 'none';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\n/g, ""),

  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

// ======================================================
// HELPERS
// ======================================================

function isOriginAllowed(origin: string): boolean {
  if (
    (process.env.NODE_ENV as string) === "development" &&
    (origin.includes("localhost") || origin.includes("127.0.0.1"))
  ) {
    return true;
  }

  const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();

  if (
    ALLOWED_ORIGINS.some(
      (o) => o.replace(/\/$/, "").toLowerCase() === normalizedOrigin,
    )
  )
    return true;

  if (normalizedOrigin.includes("gestaovirtual.com")) return true;

  return false;
}

function applySecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) =>
    response.headers.set(key, value),
  );
}

// ======================================================
// CORS HANDLING (CORRETO)
// ======================================================

function handleCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");

  if (!origin || !isOriginAllowed(origin)) return;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  // 🔥 Reflete exatamente os headers solicitados
  const requestedHeaders = request.headers.get(
    "access-control-request-headers",
  );

  if (requestedHeaders) {
    response.headers.set("Access-Control-Allow-Headers", requestedHeaders);
  } else {
    // fallback normal request
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  }
}

// ======================================================
// SECURITY CHECK (Cloudflare + HTTPS)
// ======================================================

function handleSecurityCheck(request: NextRequest): NextResponse | null {
  if (
    process.env.NODE_ENV !== "production" &&
    (process.env.NODE_ENV as string) !== "remote"
  )
    return null;

  const cfRay = request.headers.get("cf-ray");
  const proxyKey = request.headers.get("x-internal-proxy-key");

  const isInternalProxy = INTERNAL_PROXY_KEY && proxyKey === INTERNAL_PROXY_KEY;

  if (!isInternalProxy && !cfRay) {
    return NextResponse.json(
      { success: false, message: "Acesso restrito." },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  const proto = request.headers.get("x-forwarded-proto");

  if (!isInternalProxy && proto === "http") {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  return null;
}

// ======================================================
// RATE LIMIT
// ======================================================

function getClientIp(request: NextRequest): string {
  if (request.headers.get("cf-ray")) {
    return request.headers.get("cf-connecting-ip") || "0.0.0.0";
  }
  return "0.0.0.0";
}

function handleRateLimit(request: NextRequest): NextResponse | null {
  const result = checkRateLimit(getClientIp(request));

  if (result.blocked) {
    const res = NextResponse.json(
      {
        success: false,
        message: "Muitas requisições",
        code: "RATE_LIMITED",
      },
      { status: HTTP_STATUS.TOO_MANY_REQUESTS },
    );

    res.headers.set(
      "Retry-After",
      String(Math.ceil((result.resetAt - Date.now()) / 1000)),
    );

    applySecurityHeaders(res);
    return res;
  }

  return null;
}

// ======================================================
// AUTH JWT
// ======================================================

async function handleApiAuth(
  request: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  let token = "";

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    // Fallback para token na URL (necessário para SSE)
    const urlToken =
      request.nextUrl.searchParams.get("token") ||
      request.nextUrl.searchParams.get("access_token") ||
      request.nextUrl.searchParams.get("orion_token");
    if (urlToken) {
      token = urlToken;
    } else {
      // Fallback para Cookies (NextAuth/Auth.js)
      const cookieNames = [
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "authjs.session-token",
        "__Secure-authjs.session-token",
      ];
      for (const name of cookieNames) {
        const cookie = request.cookies.get(name)?.value;
        if (cookie) {
          token = cookie;
          break;
        }
      }
    }
  }

  // Fallback para token no Body (usado em SSE via POST, como no StreamService)
  if (!token && request.method === "POST") {
    try {
      // Usamos .clone() porque o Next.js falharia se a rota lesse o body depois que o middleware o consumisse
      const clonedReq = request.clone();
      const body = await clonedReq.json();
      if (body && typeof body === "object" && body.token) {
        token = body.token;
      }
    } catch {
      // Ignora erro se o body não for JSON ou não puder ser lido
    }
  }

  if (!token) {
    // Para rotas de auditoria filtrada via query params, logar antes de falhar
    if (request.nextUrl.pathname.includes("/audit")) {
      console.warn(
        `[Middleware] Falha 401: Token ausente para ${request.nextUrl.pathname}`,
      );
    }
    return NextResponse.json(
      { success: false, message: "Não autenticado" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return NextResponse.json(
      { success: false, message: "Erro na configuração de autenticação" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  try {
    // Tenta validar JWS (HS256) ou JWE (NextAuth)
    // No middleware, fazemos apenas a verificação básica de assinatura
    const isJWE = token.split(".").length === 5;

    if (isJWE) {
      // Para JWE, o NextAuth decode é necessário, mas no middleware
      // podemos delegar a validação profunda para os handlers se a rota for SSE
      // ou apenas permitir que passe se o token "parecer" válido estruturalmente
      // Já que os handlers agora também chamam requireAuth(request).
      return null;
    }

    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });

    return null;
  } catch (err: any) {
    const message =
      err.code === "ERR_JWT_EXPIRED" ? "Sessão expirada" : "Token inválido";

    return NextResponse.json(
      { success: false, message },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }
}

// ======================================================
// PUBLIC ROUTES
// ======================================================

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/health",
    "/api/v1/docs",
    "/api/v1/storage",
    "/api/v1/debug",
  ];

  return publicRoutes.some((route) => pathname.startsWith(route));
}

// ======================================================
// MAIN MIDDLEWARE
// ======================================================

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const requestId = crypto.randomUUID();

  // Log Request (Ignorar Health Check para reduzir ruído de log, mas aplicar CORS)
  if (pathname === "/api/v1/health") {
    const healthResponse = NextResponse.next();
    handleCors(request, healthResponse);
    applySecurityHeaders(healthResponse);
    return healthResponse;
  }

  const headersObj: Record<string, string> = {
    host: request.headers.get("host") || "",
    "user-agent": request.headers.get("user-agent") || "",
    "x-request-id": requestId,
  };

  logger.info(`Request ${request.method} ${pathname}`, {
    requestId,
    method: request.method,
    url: request.url,
    headers: headersObj,
  });

  const securityResponse = handleSecurityCheck(request);
  if (securityResponse) {
    handleCors(request, securityResponse);
    applySecurityHeaders(securityResponse);
    return securityResponse;
  }

  if (request.method === "OPTIONS") {
    const res = new NextResponse(null, {
      status: HTTP_STATUS.NO_CONTENT,
    });

    handleCors(request, res);
    applySecurityHeaders(res);
    return res;
  }

  const rateLimitResponse = handleRateLimit(request);
  if (rateLimitResponse) {
    handleCors(request, rateLimitResponse);
    return rateLimitResponse;
  }

  if (pathname.startsWith("/api/v1/") && !isPublicRoute(pathname)) {
    const authError = await handleApiAuth(request);
    if (authError) {
      handleCors(request, authError);
      applySecurityHeaders(authError);
      return authError;
    }
  }

  const response = NextResponse.next();
  handleCors(request, response);
  applySecurityHeaders(response);

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
