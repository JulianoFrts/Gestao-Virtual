/**
 * Middleware Global - GESTÃO VIRTUAL Backend
 *
 * Intercepta todas as requisições para API para aplicar:
 * - CORS
 * - Rate Limiting
 * - Security Headers
 * - Logging
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import { jwtVerify } from "jose";


// =============================================
// CONFIGURAÇÃO CORS
// =============================================

const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL?.replace(/['"]/g, ""),
  process.env.FRONTEND_URL?.replace(/['"]/g, ""),
].filter(Boolean) as string[];

// Log de inicialização para depuração em produção
if (process.env.NODE_ENV === "production") {
  console.log(`[CORS/v76] 🔧 Cloudflare Shield Active: NEXTAUTH_URL=${process.env.NEXTAUTH_URL}`);
  console.log(`[CORS/v76] 🛡️ IP Trust: Cloudflare (cf-connecting-ip) enabled.`);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, cache-control, pragma, expires, origin, accept, accept-language, x-forwarded-for, x-real-ip",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

// =============================================
// SECURITY HEADERS
// =============================================

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

/**
 * Obtém IP do cliente da requisição
 */
function getClientIp(request: NextRequest): string {
  // 1. Prioridade para Cloudflare (IP Real do Usuário)
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // 2. Fallback para True-Client-IP (Enterprise Cloudflare)
  const trueClientIp = request.headers.get("true-client-ip");
  if (trueClientIp) return trueClientIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const ip = (request as any).ip || "0.0.0.0";
  return ip === "::1" ? "127.0.0.1" : ip;
}

/**
 * Verifica se origem é permitida
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;

  // Normaliza origens removendo barra final para comparação justa
  const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
  const normalizedAllowed = ALLOWED_ORIGINS.map(o => o.replace(/\/$/, "").toLowerCase());

  if (process.env.NODE_ENV === "development") {
    if (normalizedOrigin.includes("localhost") || normalizedOrigin.includes("127.0.0.1"))
      return true;
  }

  // Check 1: Match exato com as envs
  if (normalizedAllowed.includes(normalizedOrigin)) return true;

  // Check 2: Match de domínios confiáveis (Apenas o domínio oficial via Cloudflare)
  if (
    normalizedOrigin.includes("gestaovirtual.com") ||
    normalizedOrigin.includes("www.gestaovirtual.com")
  ) {
    return true;
  }

  const isAllowed = false;

  if (!isAllowed) {
    console.warn(`[CORS/v76] ⚠️ Origem bloqueada: ${origin}`);
  }

  return isAllowed;
}

/**
 * Aplica headers de resposta
 */
function applyHeaders(response: NextResponse, origin: string | null): void {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  applySecurityHeaders(response);
}

function applySecurityHeaders(response: NextResponse): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

// =============================================
// MIDDLEWARE PRINCIPAL
// =============================================

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const pathname = request.nextUrl.pathname;
  const cfRay = request.headers.get("cf-ray") || "none";

  // 0. CLOUDFLARE ARMOR & PROTOCOL ENFORCEMENT
  if (process.env.NODE_ENV === "production") {
    // Bloqueio de acesso direto (sem passar pelo Cloudflare)
    if (!cfRay || cfRay === "none") {
      console.warn(`[SECURITY/v89] 🚫 Bloqueando acesso direto sem Cloudflare Ray. Host: ${request.headers.get("host")}`);
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Acesso restrito: Por favor, use o domínio oficial da aplicação.",
          error: "Direct access blocked by CF Armor"
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const proto = request.headers.get("x-forwarded-proto");
    const forwardHost = request.headers.get("x-forwarded-host") || request.headers.get("host");

    // Se o Cloudflare estiver mandando HTTP (ou redirecionamento mal configurado na borda), forçamos o upgrade
    if (proto === "http") {
      console.log(`[SECURITY/v89] Protocolo HTTP detectado via ray: ${cfRay}. Redirecionando...`);
      const httpsUrl = new URL(request.url);
      httpsUrl.protocol = "https:";
      if (forwardHost) httpsUrl.host = forwardHost;
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  // 1. Normalização do caminho para verificação (v96 - Absolute Support)
  // Remove o prefixo /api/v1 ou a URL absoluta se presente para permitir o check de compatibilidade
  let internalPath = pathname;
  const apiPrefix = "/api/v1/";
  const absolutePrefix = "api.gestaovirtual.com/api/v1/";

  if (pathname.startsWith(apiPrefix)) {
    internalPath = "/" + pathname.substring(apiPrefix.length);
  } else if (pathname.includes(absolutePrefix)) {
    const parts = pathname.split(absolutePrefix);
    internalPath = "/" + parts[1];
  } else if (pathname === "/api/v1" || pathname.endsWith("api.gestaovirtual.com/api/v1")) {
    internalPath = "/";
  }

  // 2. Verificar se o caminho interno precisa de reescrita
  const rewriteResponse = tryRewriteCompatibilityPath(
    pathname,
    internalPath,
    request,
    origin,
  );
  if (rewriteResponse) return rewriteResponse;

  // 3. Bloqueio de acesso direto a endpoints sensíveis (deve passar pelo Cloudflare/Domínio Oficial)
  if (pathname.includes("/db/query") && process.env.NODE_ENV === "production") {
    const host = request.headers.get("host") || "";
    const hasCfHeader = !!request.headers.get("cf-connecting-ip");

    // Se o host for o da SquareCloud ou não tiver o header do Cloudflare, bloqueia
    if (host.includes("squareweb.app") || !hasCfHeader) {
      console.warn(`[SECURITY] Acesso direto bloqueado ao endpoint sensível: ${pathname} vindo do host ${host}`);
      const response = NextResponse.json(
        {
          success: false,
          message: "Acesso restrito. Este recurso deve ser acessado via domínio oficial (Cloudflare).",
          code: "DIRECT_ACCESS_FORBIDDEN"
        },
        { status: 403 }
      );
      applyHeaders(response, origin);
      return response;
    }
  }

  // ----- PREFLIGHT (OPTIONS) -----
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    applyHeaders(response, origin);
    return response;
  }

  // ----- RATE LIMITING -----
  const rateLimitResponse = handleRateLimit(request, origin);
  if (rateLimitResponse && rateLimitResponse.status === 429) return rateLimitResponse;

  // ----- AUTENTICAÇÃO JWT -----
  if (pathname.startsWith("/api/v1/") && !isPublicRoute(pathname)) {
    const authError = await handleAuth(request);
    if (authError) {
      applyHeaders(authError, origin);
      return authError;
    }
  }

  // ----- RESPOSTA NORMAL -----
  const response = NextResponse.next();
  applyHeaders(response, origin);
  return response;
}

// =============================================
// CONFIGURAÇÃO DE MATCHER
// =============================================

// =============================================
// HELPER FUNCTIONS (EXTRACTED)
// =============================================

function tryRewriteCompatibilityPath(
  pathname: string,
  internalPath: string,
  request: NextRequest,
  origin: string | null,
): NextResponse | null {
  const compatMap: Record<string, string> = {
    // Core Resources
    "/User": "/api/v1/users",
    "/Users": "/api/v1/users",
    "/profiles": "/api/v1/users",
    "/Employee": "/api/v1/employees",
    "/Employees": "/api/v1/employees",
    "/Team": "/api/v1/teams",
    "/Project": "/api/v1/projects",
    "/Site": "/api/v1/sites",
    "/Company": "/api/v1/companies",
    "/JobFunction": "/api/v1/job_functions",
    "/job-functions": "/api/v1/job_functions",
    "/job_functions": "/api/v1/job_functions",
    "/TimeRecord": "/api/v1/time_records",
    "/time-records": "/api/v1/time_records",
    "/DailyReport": "/api/v1/daily_reports",
    "/daily-reports": "/api/v1/daily_reports",
    "/PermissionLevel": "/api/v1/permission_levels",
    "/permission-levels": "/api/v1/permission_levels",
    "/TeamMember": "/api/v1/team_members",
    "/team-members": "/api/v1/team_members",
    "/SystemMessage": "/api/v1/system_messages",
    "/system-messages": "/api/v1/system_messages",
    "/permission-modules": "/api/v1/permission_modules",
    "/permission-matrix": "/api/v1/permission_matrix",
    "/TemporaryPermission": "/api/v1/temporary_permissions",
    "/temporary-permissions": "/api/v1/temporary_permissions",
    "/UserRole": "/api/v1/user_roles",
    "/user-roles": "/api/v1/user_roles",
    "/roles": "/api/v1/user_roles",
    "/members": "/api/v1/team_members",
    "/WorkStage": "/api/v1/work_stages",
    "/work-stages": "/api/v1/work_stages",
    "/work_stages": "/api/v1/work_stages",
    "/messages": "/api/v1/system_messages",

    // Production Module
    "/TowerStatus": "/api/v1/production/tower-status",
    "/tower-status": "/api/v1/production/tower-status",
    "/ProductionLogs": "/api/v1/production/logs",
    "/production-logs": "/api/v1/production/logs",
    "/ProductionSchedule": "/api/v1/production/schedule",
    "/production-schedule": "/api/v1/production/schedule",
    "/ProductionActivity": "/api/v1/production/activities",
    "/production-activities": "/api/v1/production/activities",

    // Auth & RPC
    "/rpc/resolve_login_identifier": "/api/v1/rpc/resolve_login_identifier",
    "/rpc/login_funcionario": "/api/v1/rpc/login_funcionario",
    "/auth/login": "/api/v1/auth/login",
    "/auth/register": "/api/v1/auth/register",
    "/auth/me": "/api/v1/users/profile",
    "/auth/update": "/api/v1/users/profile",
  };

  for (const [pattern, target] of Object.entries(compatMap)) {
    if (pathname === target) continue;

    if (internalPath === pattern || internalPath.startsWith(pattern + "/")) {
      const rest = internalPath.slice(pattern.length);
      const targetPath = target + rest;

      if (pathname === targetPath) continue;

      const newUrl = new URL(targetPath, request.url);
      newUrl.search = request.nextUrl.search;

      console.log(`[COMPAT] Rewriting ${pathname} -> ${targetPath}`);
      const response = NextResponse.rewrite(newUrl);
      applyHeaders(response, origin);
      return response;
    }
  }
  return null;
}

function handleRateLimit(
  request: NextRequest,
  origin: string | null,
): NextResponse | null {
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp);

  if (rateLimitResult.blocked) {
    const response = NextResponse.json(
      {
        success: false,
        message: rateLimitResult.message || "Muitas requisições",
        code: "RATE_LIMITED",
        timestamp: new Date().toISOString(),
      },
      { status: 429 },
    );

    response.headers.set(
      "Retry-After",
      String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
    );
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetAt));

    applyHeaders(response, origin);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set(
    "X-RateLimit-Remaining",
    String(rateLimitResult.remaining),
  );
  response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetAt));
  applyHeaders(response, origin);

  // Note: Since we need to return the response to be used as final,
  // but middleware usually continues if not blocked.
  // In the main function, we only return if blocked or rewritten.
  // If not blocked, we return null so the main function continues to "RESPOSTA NORMAL".
  // Wait, the main function structure was: if (api) { ... return response (with headers) } else { return next() }
  // Actually the main function was returning response created by `NextResponse.next()` + headers.
  // So if I return a response here, it stops chain?
  // The original code returned response immediately inside the if block for both blocked and allowed cases.
  // So yes, I should return response.
  return response;
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/health",
    "/api/v1/docs",
    "/api/v1/rpc/resolve_login_identifier",
    "/api/v1/rpc/login_funcionario",
    // SSE endpoint - faz sua própria validação de token via query param
    // (EventSource não suporta headers customizados)
    "/api/v1/audit/scan-stream",
  ];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
}

async function handleAuth(request: NextRequest): Promise<NextResponse | null> {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Não autenticado" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

    if (!jwtSecret) {
      console.error("[AUTH] JWT Secret não configurada");
      return NextResponse.json(
        { success: false, message: "Erro interno de autenticação" },
        { status: 500 },
      );
    }

    try {
      const secret = new TextEncoder().encode(jwtSecret);
      await jwtVerify(token, secret);
      return null; // Token válido
    } catch (error: any) {
      if (error.code === "ERR_JWT_EXPIRED") {
        return NextResponse.json(
          { success: false, message: "Sessão expirada", code: "TOKEN_EXPIRED" },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { success: false, message: "Token inválido" },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Erro ao validar sessão" },
      { status: 401 },
    );
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
