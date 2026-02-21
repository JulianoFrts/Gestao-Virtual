import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import { jwtVerify } from "jose";
import { HTTP_STATUS } from "@/lib/constants";

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

  "Strict-Transport-Security":
    "max-age=63072000; includeSubDomains; preload",
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
      (o) => o.replace(/\/$/, "").toLowerCase() === normalizedOrigin
    )
  )
    return true;

  if (normalizedOrigin.includes("gestaovirtual.com")) return true;

  return false;
}

function applySecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) =>
    response.headers.set(key, value)
  );
}

// ======================================================
// CORS HANDLING (CORRETO)
// ======================================================

function handleCors(
  request: NextRequest,
  response: NextResponse
) {
  const origin = request.headers.get("origin");

  if (!origin || !isOriginAllowed(origin)) return;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  // 🔥 Reflete exatamente os headers solicitados
  const requestedHeaders = request.headers.get(
    "access-control-request-headers"
  );

  if (requestedHeaders) {
    response.headers.set(
      "Access-Control-Allow-Headers",
      requestedHeaders
    );
  } else {
    // fallback normal request
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }
}

// ======================================================
// SECURITY CHECK (Cloudflare + HTTPS)
// ======================================================

function handleSecurityCheck(
  request: NextRequest
): NextResponse | null {
  if (process.env.NODE_ENV !== "production" && (process.env.NODE_ENV as string) !== "remote") return null;

  const cfRay = request.headers.get("cf-ray");
  const proxyKey = request.headers.get("x-internal-proxy-key");

  const isInternalProxy =
    INTERNAL_PROXY_KEY && proxyKey === INTERNAL_PROXY_KEY;

  if (!isInternalProxy && !cfRay) {
    return NextResponse.json(
      { success: false, message: "Acesso restrito." },
      { status: HTTP_STATUS.FORBIDDEN }
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

function handleRateLimit(
  request: NextRequest
): NextResponse | null {
  const result = checkRateLimit(getClientIp(request));

  if (result.blocked) {
    const res = NextResponse.json(
      {
        success: false,
        message: "Muitas requisições",
        code: "RATE_LIMITED",
      },
      { status: HTTP_STATUS.TOO_MANY_REQUESTS }
    );

    res.headers.set(
      "Retry-After",
      String(Math.ceil((result.resetAt - Date.now()) / 1000))
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
  request: NextRequest
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, message: "Não autenticado" },
      { status: HTTP_STATUS.UNAUTHORIZED }
    );
  }

  const token = authHeader.substring(7);
  const secret =
    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return NextResponse.json(
      { success: false, message: "Erro na configuração de autenticação" },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });

    return null;
  } catch (err: any) {
    const message =
      err.code === "ERR_JWT_EXPIRED"
        ? "Sessão expirada"
        : "Token inválido";

    return NextResponse.json(
      { success: false, message },
      { status: HTTP_STATUS.UNAUTHORIZED }
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
  ];

  return publicRoutes.some((route) =>
    pathname.startsWith(route)
  );
}

// ======================================================
// MAIN MIDDLEWARE
// ======================================================

export async function middleware(
  request: NextRequest
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

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

  if (
    pathname.startsWith("/api/v1/") &&
    !isPublicRoute(pathname)
  ) {
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