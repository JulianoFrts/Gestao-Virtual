import { prisma } from "../lib/prisma/client";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script de Diagnóstico Local v108
 * Valida a arquitetura Builder/Proxy e a conexão segura.
 */
async function runDiagnostic() {
    console.log("🔍 [v108] Iniciando Diagnóstico de Conexão...");

    try {
        console.log("\n--- TESTE 1: Auth Credentials (via Proxy) ---");
        const count = await prisma.authCredential.count();
        console.log(`✅ Conexão estabelecida! Total de credenciais: ${count}`);

        const result = await prisma.authCredential.findFirst({
            select: { id: true, email: true, mfaEnabled: true }
        });

        console.log("📊 Amostra de Dados:");
        console.log(JSON.stringify(result, null, 2));

        if (result && typeof result.mfaEnabled === 'boolean') {
            console.log("✅ mfaEnabled mapeado corretamente como BOOLEANO.");
        }

    } catch (err: any) {
        console.error("🚨 Falha no Diagnóstico v108:", err.message);
    } finally {
        await prisma.$disconnect();
        console.log("\n🏁 Fim do Diagnóstico.");
    }
}

runDiagnostic();
