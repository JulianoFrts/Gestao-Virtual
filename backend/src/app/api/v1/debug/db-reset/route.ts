import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * v97.6: Pure URL & SQL Fallback Protocol
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

    // v97.6: Voltando ao básico que funcionava no startup script
    const fixDatabaseUrl = (url: string) => {
        try {
            const u = new URL(url.replace(/['"]/g, ""));
            // Só forçamos o banco se estiver vazio ou for o default do postgres
            if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres") {
                u.pathname = "/squarecloud";
            }
            // REMOVIDO: u.searchParams.set("schema", ...) -> Deixamos virem as flags originais
            return u.toString();
        } catch (e) { return url; }
    };

    const finalDbUrl = fixDatabaseUrl(dbUrl);
    const action = request.nextUrl.searchParams.get("action") || "nuke";

    console.log(`💣 [PANIC/v97.6] Ação: ${action}`);

    const pool = new Pool({
        connectionString: finalDbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            if (action === "nuke") {
                console.log("💣 [PANIC] Executando Nuke Tradicional (v97.6)...");
                await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
                await client.query('CREATE SCHEMA public;');
                await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                await client.query('GRANT ALL ON SCHEMA public TO public;');
                await client.query('ALTER SCHEMA public OWNER TO squarecloud;');
                console.log("✨ SCHEMA public REFRESHED!");
                return NextResponse.json({ message: "Database nuked. Now run with ?action=sync" });
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução (v97.6)...");

                const { execSync } = require('child_process');
                const schemaPath = "prisma/schema.prisma";
                const safeUrl = finalDbUrl.replace(/['"]/g, '');

                try {
                    // 1. Tentar DB PUSH (Modo Padrão)
                    console.log("⚒️ Tentativa 1: prisma db push...");
                    execSync(`npx prisma db push --accept-data-loss --schema=${schemaPath}`, {
                        env: { ...process.env, DATABASE_URL: safeUrl },
                        encoding: 'utf8'
                    });
                    console.log("✅ DB PUSH Sucesso!");
                } catch (pushError: any) {
                    console.warn("⚠️ DB PUSH Falhou (Provável P1010). Tentando Fallback de SQL Nativo...");

                    try {
                        // 2. Fallback: Gerar DDL via Prisma Migrate Diff
                        console.log("📜 Gerando DDL do schema...");
                        const ddl = execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel ${schemaPath} --script`, {
                            env: { ...process.env, DATABASE_URL: safeUrl },
                            encoding: 'utf8'
                        });

                        console.log("⚒️ Aplicando DDL manualmente via SQL...");
                        // Dividimos o DDL em comandos básicos (simplificado) ou enviamos tudo
                        await client.query(ddl);
                        console.log("✅ Sincronização via SQL Nativo concluída!");
                    } catch (fallbackError: any) {
                        console.error("❌ Falha crítica no Fallback de SQL:", fallbackError.message);
                        throw pushError; // Lança o erro original do prisma para diagnóstico
                    }
                }

                // 3. RESTORE
                console.log("📥 Rodando restore-from-backup...");
                execSync('npx tsx src/scripts/restore-from-backup.ts', {
                    env: { ...process.env, DATABASE_URL: safeUrl },
                    encoding: 'utf8'
                });
                console.log("✅ RESTORE Sucesso!");

                return NextResponse.json({
                    message: "Sync and Restore finished successfully (v97.6)! 🏆",
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
