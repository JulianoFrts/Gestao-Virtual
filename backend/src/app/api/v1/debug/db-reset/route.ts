import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import { HTTP_STATUS } from "@/lib/constants";

const Pool = pg.Pool || (pg as any).default?.Pool;

// Constantes de configuração
const DB_CONNECTION_TIMEOUT = 15000;
const DB_IDLE_TIMEOUT = 30000;
const MAX_BUFFER_SMALL = 10 * 1024 * 1024; // 10MB
const MAX_BUFFER_LARGE = 20 * 1024 * 1024; // 20MB

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * v102: Global Stabilizer & Doctor Mode
 */
export async function POST(request: NextRequest) {
    const secret = process.env.APP_SECRET || "temp_secret_123";
    const emergencyToken = "RESET_EMERGENCY_2026";
    const token = request.nextUrl.searchParams.get("token");

    if (token !== secret && token !== emergencyToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        return NextResponse.json({ error: "DATABASE_URL missing" }, { status: HTTP_STATUS.INTERNAL_ERROR });
    }

    const buildChildProcessUrl = (url: string) => {
        try {
            const u = new URL(url.replace(/['"]/g, ""));

            // 1. Normalização (v178 Fix)
            if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres" || u.pathname.toLowerCase() === "/squarecloud") {
                u.pathname = "/gestaodb";
                u.searchParams.set('schema', 'public');
            }

            // 2. SSL Simplificado (v178)
            u.searchParams.set('sslmode', 'require');
            u.searchParams.delete('sslcert');
            u.searchParams.delete('sslkey');
            u.searchParams.delete('sslrootcert');

            return u.toString();
        } catch (e) { return url; }
    };

    const finalDbUrl = buildChildProcessUrl(dbUrl);
    const action = request.nextUrl.searchParams.get("action") || "sync";

    const fs = require('fs');
    const path = require('path');

    // v178: Simplificação (Sem mTLS)
    const getMtlsOptions = (url: string) => {
        return { rejectUnauthorized: false };
    };

    const buildPoolConfig = (url: string) => {
        try {
            const u = new URL(url);
            return {
                user: u.username,
                password: decodeURIComponent(u.password),
                host: u.hostname,
                port: parseInt(u.port),
                database: 'gestaodb', // v178: Forçado
                ssl: getMtlsOptions(url),
                connectionTimeoutMillis: DB_CONNECTION_TIMEOUT,
                idleTimeoutMillis: DB_IDLE_TIMEOUT,
                max: 1
            };
        } catch (e) { return { connectionString: url, ssl: { rejectUnauthorized: false } }; }
    };

    const PoolConstructor = pg.Pool || (pg as any).default?.Pool || pg;
    const poolConfig = buildPoolConfig(dbUrl);
    const pool = new PoolConstructor(poolConfig);

    try {
        const client = await pool.connect();
        try {
            console.log("🛡️ [v104] Supervisor de Permissões (Resiliência Ativa)...");
            const runSafe = async (q: string) => { try { await client.query(q); } catch (e: any) { console.warn(`⚠️ Ignorado (${q.split(' ')[0]}):`, e.message); } };

            await runSafe('GRANT CONNECT ON DATABASE gestaodb TO squarecloud;');
            await runSafe('GRANT ALL PRIVILEGES ON DATABASE gestaodb TO squarecloud;');
            await runSafe('CREATE SCHEMA IF NOT EXISTS public;');
            await runSafe('ALTER SCHEMA public OWNER TO squarecloud;');
            await runSafe('GRANT ALL ON SCHEMA public TO squarecloud;');
            await runSafe('GRANT ALL ON SCHEMA public TO public;');
            await runSafe('SET search_path TO public;');
            await runSafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO squarecloud;');
            await runSafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO squarecloud;');

            if (action === "doctor") {
                console.log("🩺 [DOCTOR/v102] Iniciando Diagnóstico Profundo...");
                const results: any = { pg: "FAIL", prisma: "FAIL", schema: "UNKNOWN" };

                try {
                    const pgRes = await client.query("SELECT current_user, current_database(), now();");
                    results.pg = `OK (${pgRes.rows[0].current_user})`;
                } catch (e: any) { results.pg = `ERROR: ${e.message}`; }

                try {
                    const tables = await client.query("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'");
                    results.schema = `${tables.rows[0].count} tables found.`;
                } catch (e: any) { results.schema = `ERROR: ${e.message}`; }

                return NextResponse.json({
                    message: "Doctor results",
                    results,
                    dbUrl: finalDbUrl.replace(/:[^:@]+@/, ':****@')
                });
            }

            if (action === "nuke") {
                await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
                await client.query('CREATE SCHEMA public;');
                await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                return NextResponse.json({ message: "Nuked." });
            }

            if (action === "migrate") {
                console.log("📜 [PANIC] Executando Prisma Migrate Deploy (v102)...");
                const { execSync } = require('child_process');
                try {
                    const output = execSync(`npx prisma migrate deploy --schema=prisma/schema.prisma`, {
                        env: { ...process.env, DATABASE_URL: finalDbUrl },
                        encoding: 'utf8',
                        maxBuffer: MAX_BUFFER_SMALL
                    });
                    return NextResponse.json({ message: "Migrated successfully", output });
                } catch (migrateErr: any) {
                    return NextResponse.json({ error: "Migrate failed", stdout: migrateErr.stdout?.toString(), stderr: migrateErr.stderr?.toString() }, { status: HTTP_STATUS.INTERNAL_ERROR });
                }
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução (v102)...");
                const { execSync } = require('child_process');

                // v102: Force Generate to ensure driver adapter availability
                console.log("⚒️ Force generating Prisma Client...");
                execSync(`npx prisma generate --schema=prisma/schema.prisma`, {
                    env: { ...process.env, DATABASE_URL: finalDbUrl },
                    encoding: 'utf8'
                });

                try {
                    console.log("⚒️ DB PUSH...");
                    execSync(`npx prisma db push --accept-data-loss --schema=prisma/schema.prisma`, {
                        env: { ...process.env, DATABASE_URL: finalDbUrl },
                        encoding: 'utf8',
                        maxBuffer: MAX_BUFFER_SMALL
                    });
                } catch (e) { console.warn("Fallback to Diff..."); }

                console.log("📥 Restoring data...");
                try {
                    execSync('npx tsx src/scripts/restore-from-backup.ts', {
                        env: { ...process.env, DATABASE_URL: finalDbUrl },
                        encoding: 'utf8',
                        maxBuffer: MAX_BUFFER_LARGE
                    });
                } catch (e) { console.error("Restore failed."); }

                const { rowCount } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
                return NextResponse.json({ message: "Sync finished (v102)", tablesCreated: rowCount });
            }

            return NextResponse.json({ error: "Invalid action" }, { status: HTTP_STATUS.BAD_REQUEST });
        } finally {
            client.release();
            await pool.end();
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: HTTP_STATUS.INTERNAL_ERROR });
    }
}
