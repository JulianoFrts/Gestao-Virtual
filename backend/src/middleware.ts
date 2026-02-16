import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import { jwtVerify } from "jose";
import { HTTP_STATUS } from "@/lib/constants";

// =============================================
// HELPERS
// =============================================
const INTERNAL_PROXY_KEY = process.env.INTERNAL_PROXY_KEY || '';
const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL?.replace(/['"]/g, ""),
  process.env.FRONTEND_URL?.replace(/['"]/g, ""),
].filter(Boolean) as string[];

if (process.env.NODE_ENV === "production" && INTERNAL_PROXY_KEY) {
  console.log(`[SECURITY] 🔒 Internal Proxy Key configurada.`);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, cache-control, pragma, expires, origin, accept, accept-language, x-forwarded-for, x-real-ip",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// =============================================
// HANDLERS
// =============================================

function applyHeaders(response: NextResponse, origin: string | null): void {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  Object.entries(CORS_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
}

function handleCorsPreflight(request: NextRequest, origin: string | null): NextResponse {
  const response = new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT });
  applyHeaders(response, origin);
  return response;
}

function handleSecurityCheck(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const cfRay = request.headers.get("cf-ray");
  const proxyKey = request.headers.get("x-internal-proxy-key");
  const isInternalProxy = INTERNAL_PROXY_KEY && proxyKey === INTERNAL_PROXY_KEY;

  // Bloqueio de acesso direto (sem Cloudflare e sem Proxy Interno)
  if (!isInternalProxy && (!cfRay || cfRay === "none")) {
    console.warn(`[SECURITY] 🚫 Acesso Direto Bloqueado: ${request.headers.get("host")}`);
    return NextResponse.json(
      { success: false, message: "Acesso restrito: Use o domínio oficial." },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }

  // Force HTTPS
  const proto = request.headers.get("x-forwarded-proto");
  if (!isInternalProxy && proto === "http") {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    if (request.headers.get("x-forwarded-host")) {
      httpsUrl.host = request.headers.get("x-forwarded-host")!;
    }
    return NextResponse.redirect(httpsUrl, 301); // 301 Moved Permanently
  }

  return null;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("cf-connecting-ip") ||
    request.headers.get("true-client-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
}

function handleRateLimit(request: NextRequest, origin: string | null): NextResponse | null {
  const result = checkRateLimit(getClientIp(request));

  if (result.blocked) {
    const res = NextResponse.json(
      { success: false, message: "Muitas requisições", code: "RATE_LIMITED" },
      { status: HTTP_STATUS.TOO_MANY_REQUESTS }
    );
    res.headers.set("Retry-After", String(Math.ceil((result.resetAt - Date.now()) / 1000)));
    applyHeaders(res, origin);
    return res;
  }
  return null;
}

async function handleApiAuth(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, message: "Não autenticado" }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) return NextResponse.json({ success: false, message: "Erro configuração auth" }, { status: HTTP_STATUS.INTERNAL_ERROR });

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return null;
  } catch (err: any) {
    const message = err.code === "ERR_JWT_EXPIRED" ? "Sessão expirada" : "Token inválido";
    return NextResponse.json({ success: false, message }, { status: HTTP_STATUS.UNAUTHORIZED });
  }
}

// =============================================
// MAIN MIDDLEWARE
// =============================================

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const pathname = request.nextUrl.pathname;

  // 1. Security & HTTPS (Critical)
  const securityResponse = handleSecurityCheck(request);
  if (securityResponse) {
    applyHeaders(securityResponse, origin);
    return securityResponse;
  }

  // 2. Compatibilidade de Rotas (Rewrite) - Extract logic if needed, simplify here
  const compatResponse = tryRewriteCompatibilityPath(pathname, request, origin);
  if (compatResponse) return compatResponse;

  // 3. CORS Preflight
  if (request.method === "OPTIONS") return handleCorsPreflight(request, origin);

  // 4. Rate Limiting
  const rateLimitResponse = handleRateLimit(request, origin);
  if (rateLimitResponse) return rateLimitResponse;

  // 5. Auth Check for API
  if (pathname.startsWith("/api/v1/") && !isPublicRoute(pathname)) {
    const authError = await handleApiAuth(request);
    if (authError) {
      applyHeaders(authError, origin);
      return authError;
    }
  }

  // 6. Default Response
  const response = NextResponse.next();
  applyHeaders(response, origin);
  return response;
}

// =============================================
// HELPERS
// =============================================

function isOriginAllowed(origin: string): boolean {
  if (process.env.NODE_ENV === "development" && (origin.includes("localhost") || origin.includes("127.0.0.1"))) return true;
  const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();

  if (ALLOWED_ORIGINS.some(o => o.replace(/\/$/, "").toLowerCase() === normalizedOrigin)) return true;
  if (normalizedOrigin.includes("gestaovirtual.com")) return true;

  return false;
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/health", "/api/v1/docs",
    "/api/v1/rpc/resolve_login_identifier", "/api/v1/rpc/login_funcionario",
    "/api/v1/audit/scan-stream", "/api/v1/debug/db-reset", "/api/v1/audit_logs",
    "/api/v1/audit/architectural"
  ];
  return publicRoutes.some(route => pathname.startsWith(route));
}

function tryRewriteCompatibilityPath(pathname: string, request: NextRequest, origin: string | null): NextResponse | null {

  const compatMap: Record<string, string> = {
    "/User": "/api/v1/users", "/Users": "/api/v1/users", "/profiles": "/api/v1/users",
    "/Employee": "/api/v1/employees", "/Employees": "/api/v1/employees",
    "/Team": "/api/v1/teams", "/Project": "/api/v1/projects", "/Site": "/api/v1/sites",
    "/Company": "/api/v1/companies", "/JobFunction": "/api/v1/job_functions",
    "/TimeRecord": "/api/v1/time_records", "/DailyReport": "/api/v1/daily_reports",
    "/PermissionLevel": "/api/v1/permission_levels", "/TeamMember": "/api/v1/team_members",
    "/SystemMessage": "/api/v1/system_messages", "/TemporaryPermission": "/api/v1/temporary_permissions",
    "/UserRole": "/api/v1/user_roles", "/WorkStage": "/api/v1/work_stages",
    "/rpc/resolve_login_identifier": "/api/v1/rpc/resolve_login_identifier",
    "/auth/login": "/api/v1/auth/login", "/auth/me": "/api/v1/users/profile"
  };

  for (const [pattern, target] of Object.entries(compatMap)) {
    if (pathname.includes(pattern) && !pathname.includes("/api/v1" + pattern)) {
      // Simple heuristic: if request has legacy pattern outside api/v1 context
      // Logic simplified for readability. Complex logic extracted to separate service if needed.
      // For now, keep simple rewriter or just return null if not critical.
      const newUrl = new URL(target, request.url);
      newUrl.search = request.nextUrl.search;
      const res = NextResponse.rewrite(newUrl);
      applyHeaders(res, origin);
      return res;
    }
  }
  return null;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
