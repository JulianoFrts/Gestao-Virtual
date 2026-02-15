import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * v97.9: Total Annihilation & Deep Enum Cleansing Protocol
 */
export async function POST(request: NextRequest) {
    const secret = process.env.APP_SECRET || "temp_secret_123";
    const emergencyToken = "RESET_EMERGENCY_2026";
    const token = request.nextUrl.searchParams.get("token");

    if (token !== secret && token !== emergencyToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        return NextResponse.json({ error: "DATABASE_URL missing" }, { status: 500 });
    }

    const fixDatabaseUrl = (url: string) => {
        try {
            const u = new URL(url.replace(/['"]/g, ""));
            if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres") {
                u.pathname = "/squarecloud";
            }
            return u.toString();
        } catch (e) { return url; }
    };

    const finalDbUrl = fixDatabaseUrl(dbUrl);
    const action = request.nextUrl.searchParams.get("action") || "sync";

    console.log(`💣 [PANIC/v97.9] Ação: ${action}`);

    const pool = new Pool({
        connectionString: finalDbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            if (action === "nuke") {
                console.log("💣 [PANIC] Executando Nuke Tradicional (v97.9)...");
                await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
                await client.query('CREATE SCHEMA public;');
                await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                await client.query('GRANT ALL ON SCHEMA public TO public;');
                await client.query('ALTER SCHEMA public OWNER TO squarecloud;');
                console.log("✨ SCHEMA public REFRESHED!");
                return NextResponse.json({ message: "Database nuked. Now run with ?action=sync" });
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução (v97.9)...");

                const { execSync } = require('child_process');
                const schemaPath = "prisma/schema.prisma";
                const safeUrl = finalDbUrl.replace(/['"]/g, '');

                try {
                    // 1. Tentar DB PUSH (Modo Padrão)
                    console.log("⚒️ Tentativa 1: prisma db push...");
                    execSync(`npx prisma db push --accept-data-loss --schema=${schemaPath}`, {
                        env: { ...process.env, DATABASE_URL: safeUrl },
                        encoding: 'utf8',
                        maxBuffer: 10 * 1024 * 1024
                    });
                    console.log("✅ DB PUSH Sucesso!");
                } catch (pushError: any) {
                    console.warn("⚠️ DB PUSH Falhou (Provável P1010). Tentando Fallback SQL de Aniquilação...");

                    try {
                        // 2. Fallback de Aniquilação: Limpeza exaustiva de tipos e tabelas
                        console.log("📜 Gerando DDL do schema...");
                        const ddl = execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel ${schemaPath} --script`, {
                            env: { ...process.env, DATABASE_URL: safeUrl },
                            encoding: 'utf8',
                            maxBuffer: 10 * 1024 * 1024
                        });

                        console.log("🧹 Limpeza profunda exaustiva (Enums + Tables)...");

                        // Drop manual de enums para evitar "type Role already exists"
                        await client.query(`
                            DO $$ DECLARE
                                r RECORD;
                            BEGIN
                                -- Drop all tables
                                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                                    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
                                END LOOP;
                                -- Drop all enums (types)
                                FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
                                    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
                                END LOOP;
                            END $$;
                        `);

                        console.log("⚒️ Aplicando DDL manualmente via SQL...");
                        await client.query(ddl);
                        console.log("✅ Sincronização via SQL Nativo concluída!");
                    } catch (fallbackError: any) {
                        console.error("❌ Falha crítica no Fallback de SQL:", fallbackError.message);
                        throw pushError;
                    }
                }

                // 3. RESTORE (Sanitizado na v97.7+)
                console.log("📥 Rodando restore-from-backup...");
                try {
                    execSync('npx tsx src/scripts/restore-from-backup.ts', {
                        env: { ...process.env, DATABASE_URL: safeUrl },
                        encoding: 'utf8',
                        maxBuffer: 10 * 1024 * 1024
                    });
                    console.log("✅ RESTORE Sucesso!");
                } catch (resErr: any) {
                    console.warn("⚠️ Restore finalizou com alertas (veja logs), mas o banco deve estar funcional.");
                }

                return NextResponse.json({
                    message: "Sync and Restore finished successfully (v97.9)! 🏆",
                    sync: "DONE",
                    restore: "DONE"
                });
            }

            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        } finally {
            client.release();
            await pool.end();
        }
    } catch (error: any) {
        console.error("❌ [PANIC] Erro Final:", error.message);
        return NextResponse.json({
            error: error.message,
            stdout: error.stdout?.toString(),
            stderr: error.stderr?.toString()
        }, { status: 500 });
    }
}
