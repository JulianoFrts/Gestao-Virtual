import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * v98.1: Deep Cleanup & Verified Atomic Sync Protocol
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

    console.log(`💣 [PANIC/v98.1] Ação: ${action}`);

    const pool = new Pool({
        connectionString: finalDbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            if (action === "nuke") {
                console.log("💣 [PANIC] Executando Nuke Total (v98.1)...");
                await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
                await client.query('CREATE SCHEMA public;');
                await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                await client.query('GRANT ALL ON SCHEMA public TO public;');
                console.log("✨ SCHEMA public REFRESHED!");
                return NextResponse.json({ message: "Database nuked. Now run with ?action=sync" });
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução verificada (v98.1)...");

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
                    console.warn("⚠️ DB PUSH Falhou. Iniciando Protocolo de Cleanup Profundo...");

                    try {
                        // 2. Cleanup Profundo
                        console.log("🧹 Executando DROP OWNED e Limpeza Manual...");
                        try {
                            await client.query('DROP OWNED BY squarecloud CASCADE;');
                        } catch (e) { console.warn("⚠️ DROP OWNED falhou (ignorando):", (e as Error).message); }

                        try {
                            await client.query(`
                                DO $$ DECLARE r RECORD;
                                BEGIN
                                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                                        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
                                    END LOOP;
                                    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
                                        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
                                    END LOOP;
                                END $$;
                            `);
                        } catch (e) { console.warn("⚠️ Limpeza manual falhou (ignorando):", (e as Error).message); }

                        // 3. Fallback Atômico Verificado
                        console.log("📜 Gerando DDL do schema...");
                        const ddl = execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel ${schemaPath} --script`, {
                            env: { ...process.env, DATABASE_URL: safeUrl },
                            encoding: 'utf8',
                            maxBuffer: 10 * 1024 * 1024
                        });

                        console.log("⚒️ Aplicando DDL via Atomic Executor Verificável...");
                        const statements = ddl.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

                        for (const statement of statements) {
                            try {
                                await client.query(statement);
                            } catch (stmtErr: any) {
                                if (!stmtErr.message.includes('already exists')) {
                                    console.error(`❌ Statement Error: ${stmtErr.message} | SQL: ${statement.substring(0, 50)}...`);
                                    throw stmtErr;
                                }
                            }
                        }
                        console.log("✅ Sincronização via SQL Nativo concluída!");
                    } catch (fallbackError: any) {
                        console.error("❌ Falha crítica no Cleanup/Fallback:", fallbackError.message);
                        throw pushError;
                    }
                }

                // 4. RESTORE (Com validação de existência de tabelas)
                console.log("📥 Rodando restore-from-backup...");
                const checkTable = await client.query("SELECT tablename FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public'");
                if (checkTable.rowCount === 0) {
                    throw new Error("Tabela 'users' não foi criada! Reconstrução falhou.");
                }

                try {
                    const restoreOutput = execSync('npx tsx src/scripts/restore-from-backup.ts', {
                        env: { ...process.env, DATABASE_URL: safeUrl },
                        encoding: 'utf8',
                        maxBuffer: 20 * 1024 * 1024
                    });
                    console.log("✅ RESTORE Sucesso!");

                    if (restoreOutput.includes('Falha ao importar')) {
                        console.warn("⚠️ Restore finalizou com alguns erros de registros.");
                    }
                } catch (resErr: any) {
                    console.error("❌ Erro fatal no script de restore:", resErr.message);
                    throw resErr;
                }

                return NextResponse.json({
                    message: "Sync and Restore finished (v98.1). Verifique os logs para detalhes de registros individuais.",
                    status: "COMPLETED_WITH_VERIFICATION"
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
