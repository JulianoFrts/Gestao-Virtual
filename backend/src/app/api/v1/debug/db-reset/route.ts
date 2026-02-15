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

                // 1. DB PUSH
                console.log("⚒️ Rodando prisma db push...");
                execSync('npx prisma db push --accept-data-loss', {
                    stdio: 'inherit',
                    env: { ...process.env, DATABASE_URL: dbUrl }
                });

                // 2. RESTORE
                console.log("📥 Rodando restore-from-backup...");
                execSync('npx tsx src/scripts/restore-from-backup.ts', {
                    stdio: 'inherit',
                    env: { ...process.env, DATABASE_URL: dbUrl }
                });

                return NextResponse.json({ message: "Sync and Restore finished successfully! 🏆" });
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
