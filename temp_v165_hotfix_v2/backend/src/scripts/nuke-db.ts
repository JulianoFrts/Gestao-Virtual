import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanDatabase() {
    console.log("🔍 Iniciando limpeza bruta do banco...");

    const dbUrl = (process.env.DATABASE_URL || '').replace(/['"]/g, "");
    if (!dbUrl) {
        console.error("❌ DATABASE_URL não encontrada.");
        process.exit(1);
    }

    const sslConfig: any = { rejectUnauthorized: false };
    const certsRoot = path.join(__dirname, '../../'); // Assumindo raiz do backend

    const findPath = (f: string) => [
        path.join(certsRoot, 'certificates', f),
        path.join(certsRoot, f)
    ].find(p => fs.existsSync(p));

    const ca = findPath('ca-certificate.crt') || findPath('ca.crt');
    if (ca) sslConfig.ca = fs.readFileSync(ca, 'utf8');

    const cert = findPath('certificate.pem') || findPath('client.crt');
    const key = findPath('private-key.key') || findPath('client.key');

    if (cert && key) {
        sslConfig.cert = fs.readFileSync(cert, 'utf8');
        sslConfig.key = fs.readFileSync(key, 'utf8');
        console.log("🛡️ Certificados mTLS carregados.");
    }

    const urlObj = new URL(dbUrl);
    const candidates = [
        dbUrl.replace(/\/([^\/?]+)(\?|$)/, '/squarecloud$2'),
        dbUrl.replace(/\/([^\/?]+)(\?|$)/, '/admin$2'),
        dbUrl.replace(/\/([^\/?]+)(\?|$)/, '/postgres$2'),
        dbUrl
    ];

    let success = false;

    for (const candidate of candidates) {
        const candUrl = new URL(candidate);
        const masked = candidate.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
        console.log(`📡 Tentando banco: ${candUrl.pathname.slice(1)}...`);

        const pool = new pg.Pool({
            user: decodeURIComponent(candUrl.username),
            password: decodeURIComponent(candUrl.password),
            host: candUrl.hostname,
            port: parseInt(candUrl.port),
            database: candUrl.pathname.slice(1),
            ssl: sslConfig,
            connectionTimeoutMillis: 5000
        });

        try {
            const client = await pool.connect();
            console.log(`✅ Conectado ao banco: ${candUrl.pathname.slice(1)}`);

            console.log("💣 Executando DROP SCHEMA public CASCADE...");
            await client.query("DROP SCHEMA public CASCADE;");
            console.log("✨ Criando novo SCHEMA public...");
            await client.query("CREATE SCHEMA public;");
            await client.query("GRANT ALL ON SCHEMA public TO public;");

            console.log("✅ Banco REFRESHED com sucesso!");
            success = true;
            client.release();
            await pool.end();
            break;
        } catch (err: any) {
            console.log(`❌ Falha no banco ${candUrl.pathname.slice(1)}: ${err.message}`);
            await pool.end();
        }
    }

    if (!success) {
        console.error("🚨 Não foi possível limpar o banco em nenhum dos candidatos.");
        process.exit(1);
    }
}

cleanDatabase();
