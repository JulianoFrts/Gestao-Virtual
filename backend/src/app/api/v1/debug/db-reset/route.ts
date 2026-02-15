import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * Força a limpeza do banco de dados (DROP SCHEMA public CASCADE) 
 * caso o script de startup falhe em detectar as flags.
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

    // Helper para garantir banco correto (v96.9.2)
    const fixDatabaseUrl = (url: string) => {
        try {
            const u = new URL(url.replace(/['"]/g, ""));
            if (!u.pathname || u.pathname === "/" || u.pathname === "/postgres") {
                console.log(`[PANIC] Redirecionando banco de ${u.pathname || 'default'} para /squarecloud`);
                u.pathname = "/squarecloud";
            }
            return u.toString();
        } catch (e) { return url; }
    };

    const finalDbUrl = fixDatabaseUrl(dbUrl);

    const action = request.nextUrl.searchParams.get("action") || "nuke";

    console.log("💣 [PANIC RESET] Instando limpeza bruta via API...");

    const pool = new Pool({
        connectionString: dbUrl.replace(/['"]/g, ""),
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            if (action === "nuke") {
                console.log("💣 [PANIC RESET] Executando DROP SCHEMA public CASCADE...");
                await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;');
                console.log("✨ SCHEMA REFRESHED!");
                return NextResponse.json({ message: "Database nuked. Now run with ?action=sync" });
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução e restore...");
                const { execSync } = require('child_process');

                const currentCwd = process.cwd();
                console.log(`📂 CWD Atual: ${currentCwd}`);
                console.log(`📡 Usando DB URL: ${finalDbUrl.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3')}`);

                try {
                    // 1. DB PUSH
                    console.log("⚒️ Rodando prisma db push...");
                    const schemaPath = "prisma/schema.prisma";

                    const pushOutput = execSync(`npx prisma db push --accept-data-loss --schema=${schemaPath}`, {
                        env: { ...process.env, DATABASE_URL: finalDbUrl },
                        encoding: 'utf8'
                    });
                    console.log("✅ DB PUSH Output:", pushOutput);

                    // 2. RESTORE
                    console.log("📥 Rodando restore-from-backup...");
                    const restoreOutput = execSync('npx tsx src/scripts/restore-from-backup.ts', {
                        env: { ...process.env, DATABASE_URL: finalDbUrl },
                        encoding: 'utf8'
                    });
                    console.log("✅ RESTORE Output:", restoreOutput);

                    return NextResponse.json({
                        message: "Sync and Restore finished successfully! 🏆",
                        push: pushOutput.substring(0, 500),
                        restore: restoreOutput.substring(0, 500)
                    });
                } catch (execError: any) {
                    console.error("❌ [PANIC SYNC] Falha detalhada:", execError.message);
                    return NextResponse.json({
                        error: "Command failed",
                        message: execError.message,
                        stdout: execError.stdout?.toString(),
                        stderr: execError.stderr?.toString()
                    }, { status: 500 });
                }
            }

            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        } finally {
            client.release();
            await pool.end();
        }
    } catch (error: any) {
        console.error("❌ [PANIC RESET] Erro:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
