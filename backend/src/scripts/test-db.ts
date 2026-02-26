import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL;

async function diagnose() {
    if (!dbUrl) {
        console.error("DATABASE_URL não encontrada no .env");
        return;
    }

    console.log("Iniciando diagnóstico...");
    console.log(`URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

    const config: unknown = {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000 /* literal */
    };

    // Tentar carregar mTLS se existirem no Windows (para teste local se possível)
    const cert = 'C:\\application\\backend\\certificates\\certificate.pem';
    if (fs.existsSync(cert)) {
        console.log("Certificados locais encontrados, aplicando mTLS...");
        config.ssl = {
            cert: fs.readFileSync(cert),
            key: fs.readFileSync('C:\\application\\backend\\certificates\\private-key.key'),
            ca: fs.readFileSync('C:\\application\\backend\\certificates\\ca-certificate.crt'),
            rejectUnauthorized: false
        };
    }

    const pool = new pg.Pool(config);

    try {
        const client = await pool.connect();
        console.log("✅ Conexão estabelecida!");

        const res = await client.query("SELECT current_user, current_database(), session_user;");
        console.log("Infos:", res.rows[0]);

        const schemas = await client.query("SELECT schema_name FROM information_schema.schemata;");
        console.log("Schemas disponíveis:", schemas.rows.map(r => r.schema_name));

        const permissions = await client.query(`
            SELECT 
                n.nspname as schema_name,
                has_schema_privilege(current_user, n.nspname, 'USAGE') as has_usage,
                has_schema_privilege(current_user, n.nspname, 'CREATE') as has_create
            FROM pg_catalog.pg_namespace n
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema';
        `);
        console.table(permissions.rows);

        client.release();
    } catch (err: unknown) {
        console.error("❌ Erro na conexão:", err.message);
        if (err.detail) console.error("Detalhe:", err.detail);
        if (err.hint) console.error("Dica:", err.hint);
    } finally {
        await pool.end();
    }
}

diagnose();
