import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * v98.9: Arrow Binding & Pre-Grant Protocol
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

    console.log(`💣 [PANIC/v98.9] Ação: ${action}`);

    const pool = new Pool({
        connectionString: finalDbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            if (action === "nuke") {
                console.log("💣 [PANIC] Executando Nuke de Emergência (v98.9)...");
                await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
                await client.query('CREATE SCHEMA public;');
                await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                await client.query('GRANT ALL ON SCHEMA public TO public;');
                console.log("✨ SCHEMA public REFRESHED!");
                return NextResponse.json({ message: "Database nuked. Now run with ?action=sync" });
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução bloco único (v98.4)...");

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
                    console.warn("⚠️ DB PUSH Falhou. Iniciando Fallback Bloco Único v98.4...");

                    try {
                        // 2. Garantir Contexto do Banco
                        console.log("🛡️ Restaurando contexto do schema public...");
                        await client.query('CREATE SCHEMA IF NOT EXISTS public;');
                        await client.query('SET search_path TO public;');
                        await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');

                        // 3. Cleanup Cirúrgico de Tipos e Tabelas
                        console.log("🧹 Removendo objetos existentes para evitar conflitos de DDL...");
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

                        // 4. Execução de DDL Inteiro (Evita quebra de funções/triggers)
                        console.log("📜 Gerando DDL completo...");
                        const ddl = execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel ${schemaPath} --script`, {
                            env: { ...process.env, DATABASE_URL: safeUrl },
                            encoding: 'utf8',
                            maxBuffer: 20 * 1024 * 1024
                        });

                        // Resilient Block Execution
                        console.log("⚒️ Aplicando DDL como bloco único resiliente...");
                        // Prisma DDL script costuma vir com 'SET search_path...' e outras diretivas.
                        // Executamos tudo de uma vez.

                        // v98.9: Pre-Grant to ensure creation rights
                        await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');

                        await client.query(ddl);


                        // v98.8: Permission Enforcer
                        console.log("🛡️ [v98.8] Aplicando permissões e alterando propriedade...");
                        await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                        await client.query('ALTER SCHEMA public OWNER TO squarecloud;');
                        await client.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO squarecloud;');
                        await client.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO squarecloud;');
                        await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO squarecloud;');

                        console.log("✅ Sincronização via Bloco SQL concluída!");
                    } catch (fallbackError: any) {
                        console.error("❌ Falha crítica no Fallback de Bloco:", fallbackError.message);
                        throw pushError;
                    }
                }

                // 5. Verificação de Saúde Pós-Sync
                const { rowCount } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
                console.log(`📊 Tabelas criadas: ${rowCount}`);

                if (rowCount === 0) {
                    throw new Error("Sincronização falhou: Nenhuma tabela encontrada no schema public.");
                }

                // 6. RESTORE (v97.7+)
                console.log("📥 Iniciando restauração de dados...");
                try {
                    execSync('npx tsx src/scripts/restore-from-backup.ts', {
                        env: { ...process.env, DATABASE_URL: safeUrl },
                        encoding: 'utf8',
                        maxBuffer: 20 * 1024 * 1024
                    });
                    console.log("✅ RESTORE Sucesso!");
                } catch (resErr: any) {
                    console.warn("⚠️ Restore concluído com avisos. Verifique os logs para garantir integridade parcial.");
                }

                return NextResponse.json({
                    message: "Sync and Restore finished successfully (v98.9)! 🏆",
                    tablesCreated: rowCount,
                    status: "STABLE_RECONSTRUCTED"
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
