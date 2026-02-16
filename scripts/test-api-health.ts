/**
 * Diagnóstico de Saúde da API ORION
 * Executa checagem de rotas críticas via SystemTestingService.
 */

import { SystemTestingService } from "../backend/src/modules/system-testing/application/system-testing.service";
import { PrismaRouteHealthRepository } from "../backend/src/modules/system-testing/infrastructure/prisma-route-health.repository";

async function runHealthCheck() {
    console.log("🚀 Iniciando Diagnóstico de Saúde da API ORION...");

    const repository = new PrismaRouteHealthRepository();
    const service = new SystemTestingService(repository);

    const criticalRoutes = [
        "/api/v1/users",
        "/api/v1/auth/session",
        "/api/v1/projects",
        "/api/v1/teams",
        "/api/v1/production/tower-status",
        "/api/v1/production/activities",
        "/api/v1/daily_reports",
        "/api/v1/work_stages",
        "/api/v1/audit/architectural",
        "/api/v1/audit_logs",
    ];

    console.log(`\nMonitorando ${criticalRoutes.length} rotas críticas...\n`);

    // Mock de User ID para o log de auditoria do teste
    const TEST_USER_ID = "cmloil9ds0000tr7ou1xix24i";

    const results = await service.checkCriticalRoutes(criticalRoutes, TEST_USER_ID);

    console.table(results.map(r => ({
        Rota: r.route,
        Status: r.status,
        Latência: r.latency,
        Código: r.code,
        Mensagem: r.message
    })));

    const failures = results.filter(r => r.status === "DOWN" || r.status === "UNSTABLE");

    if (failures.length > 0) {
        console.warn(`\n⚠️  Atenção: ${failures.length} rotas apresentaram problemas.`);
    } else {
        console.log("\n✅ Todas as rotas críticas responderam corretamente (ou estão seguras).");
    }
}

runHealthCheck().catch(err => {
    console.error("❌ Erro fatal no diagnóstico:", err);
    process.exit(1);
});
