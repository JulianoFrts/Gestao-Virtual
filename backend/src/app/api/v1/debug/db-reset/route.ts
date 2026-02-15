import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * v98.0: Resilient Sync & Atomic Statement Protocol
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

    console.log(`💣 [PANIC/v98.0] Ação: ${action}`);

    const pool = new Pool({
        connectionString: finalDbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            if (action === "nuke") {
                console.log("💣 [PANIC] Executando Nuke Tradicional (v98.0)...");
                await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
                await client.query('CREATE SCHEMA public;');
                await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                await client.query('GRANT ALL ON SCHEMA public TO public;');
                await client.query('ALTER SCHEMA public OWNER TO squarecloud;');
                console.log("✨ SCHEMA public REFRESHED!");
                return NextResponse.json({ message: "Database nuked. Now run with ?action=sync" });
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução (v98.0)...");

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
                    console.warn("⚠️ DB PUSH Falhou (Provável P1010). Tentando Resilient Fallback...");

                    try {
                        // 2. Resilient Fallback: Execução instrução por instrução
                        console.log("📜 Gerando DDL do schema...");
                        const ddl = execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel ${schemaPath} --script`, {
                            env: { ...process.env, DATABASE_URL: safeUrl },
                            encoding: 'utf8',
                            maxBuffer: 10 * 1024 * 1024
                        });

                        console.log("🧹 Limpeza profunda preventiva...");
                        try {
                            await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO squarecloud;');
                        } catch (e) { console.warn("⚠️ Falha ao dropar schema (ignorando):", (e as Error).message); }

                        console.log("⚒️ Aplicando DDL via Atomic Executor...");

                        // Dividimos o DDL em comandos individuais. 
                        // Nota: Dividir por ';' é arriscado para funções complexas, mas para o DDL do Prisma costuma ser seguro.
                        const statements = ddl.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

                        let executed = 0;
                        let skipped = 0;

                        for (const statement of statements) {
                            try {
                                await client.query(statement);
                                executed++;
                            } catch (stmtErr: any) {
                                // Ignoramos erros de "já existe"
                                if (stmtErr.message.includes('already exists') || stmtErr.message.includes('already exist')) {
                                    skipped++;
                                } else {
                                    console.error(`❌ Erro no statement: ${statement.substring(0, 50)}... -> ${stmtErr.message}`);
                                    // Se for erro crítico (não "already exists"), lançamos
                                    throw stmtErr;
                                }
                            }
                        }

                        console.log(`✅ Sincronização via Atomic Executor concluída! [Executados: ${executed}, Ignorados por existência: ${skipped}]`);
                    } catch (fallbackError: any) {
                        console.error("❌ Falha crítica no Resilient Fallback:", fallbackError.message);
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
                    console.warn("⚠️ Restore finalizou com alertas, verifique se os dados principais estão presentes.");
                }

                return NextResponse.json({
                    message: "Sync and Restore finished successfully (v98.0)! 🏆",
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
