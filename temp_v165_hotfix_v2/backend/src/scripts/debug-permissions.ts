import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function debugPermissions() {
    console.log("🔍 [DEBUG] Iniciando Auditoria de Permissões...");

    const dbUrl = process.env.DATABASE_URL?.replace(/['"]/g, "");
    if (!dbUrl) {
        console.error("🚨 DATABASE_URL não encontrada!");
        return;
    }

    console.log(`📡 URL detectada: ${dbUrl.replace(/:.*@/, ':****@')}`);

    const ssl: any = { rejectUnauthorized: false };
    const certPath = path.join(process.cwd(), 'client.crt');
    const keyPath = path.join(process.cwd(), 'client.key');
    const caPath = path.join(process.cwd(), 'ca.crt');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        ssl.cert = fs.readFileSync(certPath);
        ssl.key = fs.readFileSync(keyPath);
        if (fs.existsSync(caPath)) ssl.ca = fs.readFileSync(caPath);
        console.log("🛡️ Certificados mTLS encontrados.");
    }

    const pool = new pg.Pool({
        connectionString: dbUrl,
        ssl
    });

    try {
        const client = await pool.connect();
        console.log("✅ Conexão inicial via Driver PG OK!");

        const resDb = await client.query("SELECT current_database(), current_user, current_schema()");
        console.log("📊 Contexto Atual:", resDb.rows[0]);

        console.log("\n--- TESTE: Acesso ao Schema Public ---");
        try {
            const resSchema = await client.query("SELECT has_schema_privilege(current_user, 'public', 'USAGE') as has_usage");
            console.log(`✅ Permissão USAGE no 'public': ${resSchema.rows[0].has_usage}`);
        } catch (e: any) {
            console.error(`❌ Falha ao checar schema public: ${e.message}`);
        }

        console.log("\n--- TESTE: Tabelas Existentes ---");
        try {
            const resTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5");
            console.log("📋 Tabelas encontradas:", resTables.rows.map(r => r.table_name));
        } catch (e: any) {
            console.error(`❌ Falha ao listar tabelas: ${e.message}`);
        }

        client.release();
    } catch (err: any) {
        console.error("🚨 ERRO FATAL NO DRIVER PG:", err.message);
        if (err.stack) console.log(err.stack);
    } finally {
        await pool.end();
        console.log("\n🏁 Fim da Auditoria.");
    }
}

debugPermissions();
