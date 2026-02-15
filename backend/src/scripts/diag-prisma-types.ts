import pg from "pg";
import { OrionPgAdapter } from "../lib/prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Script de Diagnóstico Local v95
 * Valida a comunicação entre o driver PG e o adaptador Orion para o Prisma 6.
 */
async function runDiagnostic() {
    console.log("🔍 Iniciando Diagnóstico de Tipos de Banco...");

    const dbUrl = process.env.DATABASE_URL?.replace(/['"]/g, "");
    if (!dbUrl) {
        console.error("🚨 DATABASE_URL não encontrada no .env!");
        process.exit(1);
    }

    console.log(`📡 Conectando ao Banco: ${dbUrl.split('@')[1]?.split('?')[0]}`);

    // Configuração de SSL para teste local (ajustar caminhos se necessário)
    const sslConfig: any = { rejectUnauthorized: false };

    // Tenta carregar certificados locais para mTLS
    const localCertsPath = path.join(__dirname, '../../');
    const certFiles = {
        ca: [path.join(localCertsPath, 'certificates/ca-certificate.crt')],
        cert: [path.join(localCertsPath, 'certificates/certificate.pem')],
        key: [path.join(localCertsPath, 'certificates/private-key.key')]
    };

    const findFile = (list: string[]) => list.find(p => fs.existsSync(p));
    const ca = findFile(certFiles.ca);
    if (ca) sslConfig.ca = fs.readFileSync(ca, 'utf8');

    const cert = findFile(certFiles.cert);
    const key = findFile(certFiles.key);
    if (cert && key) {
        sslConfig.cert = fs.readFileSync(cert, 'utf8');
        sslConfig.key = fs.readFileSync(key, 'utf8');
        console.log("🛡️ Certificados mTLS encontrados localmente.");
    }

    // Limpa parâmetros da URL e garante o banco correto (squarecloud)
    let baseDbUrl = dbUrl.split('?')[0];
    if (baseDbUrl.endsWith('/gestao_db')) {
        baseDbUrl = baseDbUrl.replace('/gestao_db', '/squarecloud');
        console.log("🔄 Ajustando banco local para 'squarecloud'...");
    }

    const pool = new pg.Pool({
        connectionString: baseDbUrl,
        ssl: sslConfig
    });

    const adapter = new OrionPgAdapter(pool);

    try {
        console.log("\n--- TESTE 1: Auth Credentials (UUID + Boolean + DateTime) ---");
        // Nota: Adaptamos queryRaw para o formato que o Prisma envia
        const res = await (adapter as any).queryRaw({
            sql: 'SELECT id, email, role, status, mfa_enabled, last_login_at FROM auth_credentials LIMIT 1',
            args: []
        });

        if (res.ok) {
            console.log("✅ Query executada com sucesso!");
            console.log("\n📊 MAPEAMENTO DE COLUNAS:");
            res.value.columnNames.forEach((name: string, i: number) => {
                const oid = (res.value as any)._raw_fields?.[i]?.dataTypeID || 'N/A';
                console.log(`   - ${name.padEnd(15)} | OID (PG): ${oid.toString().padEnd(5)} | ID (Prisma): ${res.value.columnTypes[i]}`);
            });

            console.log("\n📄 DADOS SERIALIZADOS (Primeira Linha):");
            res.value.rows[0].forEach((val: any, i: number) => {
                console.log(`   - ${res.value.columnNames[i].padEnd(15)}: ${JSON.stringify(val)} (${typeof val})`);
            });

            // Verificações Críticas v95
            const mfaIndex = res.value.columnNames.indexOf('mfa_enabled');
            const dateIndex = res.value.columnNames.indexOf('last_login_at');

            console.log("\n⚡ VERIFICAÇÃO V95:");
            if (res.value.columnTypes[mfaIndex] === 5) {
                console.log("   ✅ mfa_enabled mapeado como BOOLEANO (ID 5).");
            } else {
                console.error(`   ❌ mfa_enabled mapeado errado (ID ${res.value.columnTypes[mfaIndex]}). Esperado: 5.`);
            }

            if (typeof res.value.rows[0][dateIndex] === 'string') {
                console.log("   ✅ last_login_at serializado como STRING.");
            } else {
                console.error(`   ❌ last_login_at ainda é ${typeof res.value.rows[0][dateIndex]}. Esperado: string.`);
            }

        } else {
            console.error("❌ Erro na Query:", res.error);
        }

    } catch (err: any) {
        console.error("🚨 Falha no Diagnóstico:", err.message);
    } finally {
        await pool.end();
        console.log("\n🏁 Fim do Diagnóstico.");
    }
}

// Execução
runDiagnostic();
