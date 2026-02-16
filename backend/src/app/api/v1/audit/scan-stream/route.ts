import { NextRequest } from "next/server";
import { isGodRole } from "@/lib/constants/security";
import { ArchitecturalAuditor } from "@/modules/audit/application/architectural-auditor.service";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "@/modules/audit/infrastructure/prisma-governance.repository";
import { logger } from "@/lib/utils/logger";
import { jwtVerify } from "jose";

const governanceService = new GovernanceService(
  new PrismaGovernanceRepository(),
);

/**
 * Valida token JWT do query parameter (para SSE que não suporta headers)
 * Usa os dados do próprio JWT para validação, evitando busca no banco.
 */
async function validateTokenFromQuery(token: string) {
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!jwtSecret) {
    logger.error("[SSE Auth] JWT Secret não configurada!");
    throw new Error("JWT Secret não configurada");
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    if (!payload) throw new Error("Token inválido");

    // Extrair dados diretamente do payload JWT
    const userId = (payload.sub || payload.id) as string;
    const userName = payload.name as string || "Unknown";
    const userRole = (payload.role as string || "").toUpperCase();

    logger.info("[SSE Auth] Token decodificado", { userId, userName, userRole });

    // Validação via Central de Segurança
    if (!isGodRole(userRole)) {
      logger.warn("[SSE Auth] Role não autorizada", { userRole });
      throw new Error(`Acesso restrito a administradores. Role atual: ${userRole}`);
    }

    logger.info("[SSE Auth] Autenticação bem sucedida", { userName, userRole });
    return { id: userId, name: userName, role: userRole };
  } catch (error: any) {
    logger.error("[SSE Auth] Erro na validação", { error: error.message, code: error.code });
    throw error;
  }
}

/**
 * SSE Streaming Endpoint para Auditoria de Código em Tempo Real
 *
 * Transmite cada violação encontrada para o frontend conforme é detectada.
 * Formato: Server-Sent Events (text/event-stream)
 *
 * Autenticação: Token JWT via query parameter (?token=xxx)
 * Nota: EventSource não suporta headers customizados, por isso usamos query param
 */
export async function GET(request: NextRequest) {
  try {
    // Obter token do query parameter
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Usuario não autorizado!" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const user = await validateTokenFromQuery(token);

    logger.info("Iniciando scan de auditoria via SSE", {
      performedBy: user.name,
      userId: user.id,
    });

    // Configurar ReadableStream para SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper para enviar eventos SSE
        const sendEvent = (type: string, data: any) => {
          const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(event));
        };

        // Enviar heartbeat inicial
        sendEvent("connected", { message: "Iniciando scan de auditoria..." });

        try {
          const auditor = new ArchitecturalAuditor(governanceService);
          const { results, summary } = await auditor.runFullAudit(user.id);

          // Enviar cada resultado individualmente
          let count = 0;
          for (const result of results) {
            count++;
            sendEvent("violation", {
              index: count,
              total: results.length,
              file: result.file,
              severity: result.severity,
              violation: result.violation,
              message: result.message,
              suggestion: result.suggestion,
            });

            // Pequeno delay para efeito visual de streaming real
            const min = 200;
            const max = 500;
            const delay = min + Math.random() * (max - min);

            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          // Enviar resumo final
          sendEvent("complete", {
            healthScore: summary.healthScore,
            totalFiles: summary.totalFiles,
            violationsCount: summary.violationsCount,
            bySeverity: summary.bySeverity,
            topIssues: summary.topIssues,
          });
        } catch (error: any) {
          sendEvent("error", { message: error.message || "Erro no scan" });
        } finally {
          controller.close();
        }
      },
    });

    // Retornar resposta SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Evitar buffering em proxies
      },
    });
  } catch (error: any) {
    logger.error("Erro ao iniciar scan SSE", { error });
    return new Response(
      JSON.stringify({ error: error.message || "Erro de autenticação" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
}
