import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * PANIC RESET API - GESTÃO VIRTUAL
 * Força a limpeza do banco de dados (DROP SCHEMA public CASCADE) 
 * caso o script de startup falhe em detectar as flags.
 */
export async function POST(request: NextRequest) {
    const secret = process.env.APP_SECRET || "temp_secret_123";
    const token = request.nextUrl.searchParams.get("token");

    if (token !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        return NextResponse.json({ error: "DATABASE_URL missing" }, { status: 500 });
    }

    console.log("💣 [PANIC RESET] Instando limpeza bruta via API...");

    const pool = new Pool({
        connectionString: dbUrl.replace(/['"]/g, ""),
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            console.log("💣 Executando DROP SCHEMA public CASCADE...");
            await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;');
            console.log("✨ SCHEMA REFRESHED!");

            return NextResponse.json({
                message: "Database nuked successfully. Restart the app with RESTORE_BACKUP=true to re-sync schema.",
                action: "RESTART_REQUIRED"
            });
        } finally {
            client.release();
            await pool.end();
        }
    } catch (error: any) {
        console.error("❌ [PANIC RESET] Erro:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
