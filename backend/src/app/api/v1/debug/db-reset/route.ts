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

    // Helper para garantir banco correto (v96.9.9)
    const fixDatabaseUrl = (url: string) => {
        try {
            const u = new URL(url.replace(/['"]/g, ""));
            const invert = request.nextUrl.searchParams.get("invert") === "true";

            // Forçamos squarecloud em vez de postgres por padrão
            if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres") {
                console.log(`[PANIC] Redirecionando banco de ${u.pathname || 'default'} para /squarecloud`);
                u.pathname = "/squarecloud";
            }

            if (invert) {
                console.log("🔄 [PANIC] Aplicando Modo Invertido (Database=public, Schema=squarecloud)");
                u.pathname = "/public";
                u.searchParams.set("schema", "squarecloud");
            }

            return u.toString();
        } catch (e) { return url; }
    };

    const finalDbUrl = fixDatabaseUrl(dbUrl);

    const action = request.nextUrl.searchParams.get("action") || "nuke";

    console.log("💣 [PANIC RESET] Instando limpeza bruta via API...");

    const pool = new Pool({
        connectionString: finalDbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        try {
            if (action === "nuke") {
                console.log("💣 [PANIC RESET] Executando Nuke de Soberania (v96.9.9)...");
                await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
                await client.query('CREATE SCHEMA public;');
                await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
                await client.query('GRANT ALL ON SCHEMA public TO public;');
                await client.query('ALTER SCHEMA public OWNER TO squarecloud;');
                console.log("✨ SCHEMA REFRESHED & SOVEREIGNTY ESTABLISHED!");
                return NextResponse.json({ message: "Database nuked. Now run with ?action=sync" });
            }

            if (action === "sync") {
                console.log("🏗️ [PANIC SYNC] Iniciando reconstrução e restore (v96.9.9)...");

                // 0. Super-Sovereignty Discovery Protocol (v96.9.9)
                console.log("🔐 Aplicando Super-Sovereignty Discovery...");
                try {
                    const dbInfo = await client.query('SELECT current_database() as db, current_schema() as sc, current_user as us;');
                    console.log(`📊 Realm: DB="${dbInfo.rows[0].db}", Schema="${dbInfo.rows[0].sc}", User="${dbInfo.rows[0].us}"`);

                    // Diagnóstico de Usuário
                    const uStat = await client.query('SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = current_user;');
                    console.log(`👤 User Stats: Createdb=${uStat.rows[0].usecreatedb}, Super=${uStat.rows[0].usesuper}`);

                    // Protocolo de Soberania Absoluta
                    const targetSchema = dbInfo.rows[0].sc || 'public';
                    const targetDB = dbInfo.rows[0].db;

                    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${targetDB} TO squarecloud;`);
                    await client.query(`GRANT ALL ON SCHEMA ${targetSchema} TO squarecloud;`);
                    await client.query(`ALTER SCHEMA ${targetSchema} OWNER TO squarecloud;`);

                    // Teste de Sanidade SQL
                    await client.query(`CREATE TABLE IF NOT EXISTS ${targetSchema}._panic_test (id int); DROP TABLE ${targetSchema}._panic_test;`);
                    console.log("✅ Soberania Confirmada e Teste SQL Passou!");
                } catch (pErr: any) {
                    console.warn("⚠️ Aviso de soberania/discovery:", pErr.message);
                }

                const { execSync } = require('child_process');
                const schemaPath = "prisma/schema.prisma";
                console.log(`📡 Usando DB URL: ${finalDbUrl.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3')}`);

                try {
                    // 1. DB PUSH
                    console.log("⚒️ Rodando prisma db push...");
                    const pushOutput = execSync(`npx prisma db push --accept-data-loss --schema=${schemaPath}`, {
                        env: { ...process.env, DATABASE_URL: finalDbUrl },
                        encoding: 'utf8'
                    });
                    console.log("✅ DB PUSH Sucesso!");

                    // 2. RESTORE
                    console.log("📥 Rodando restore-from-backup...");
                    const restoreOutput = execSync('npx tsx src/scripts/restore-from-backup.ts', {
                        env: { ...process.env, DATABASE_URL: finalDbUrl },
                        encoding: 'utf8'
                    });
                    console.log("✅ RESTORE Sucesso!");

                    return NextResponse.json({
                        message: "Sync and Restore finished successfully! 🏆",
                        push: "DONE",
                        restore: "DONE"
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
