import { Pool, PoolConfig } from "pg";
import { execSync } from "child_process";
import { HTTP_STATUS } from "@/lib/constants";
const DEFAULT_TIMEOUT_MS = 30000;

export interface DbDoctorResult {
    pg: string;
    prisma: string;
    schema: string;
}

export class DatabaseManagementService {
    private readonly dbUrl: string;

    constructor() {
        this.dbUrl = process.env.DATABASE_URL || "";
    }

    public async runAction(action: string): Promise<any> {
        if (!this.dbUrl) {
            throw new Error("DATABASE_URL missing");
        }

        const finalUrl = this.buildChildProcessUrl(this.dbUrl);

        switch (action) {
            case "doctor":
                return this.runDoctor(finalUrl);
            case "nuke":
                return this.runNuke();
            case "migrate":
                return this.runMigrate(finalUrl);
            case "sync":
                return this.runSync(finalUrl);
            default:
                throw new Error("Invalid action");
        }
    }

    private async runDoctor(url: string): Promise<{ results: DbDoctorResult, dbUrl: string }> {
        const results: DbDoctorResult = { pg: "FAIL", prisma: "FAIL", schema: "UNKNOWN" };
        const pool = this.getPool();

        try {
            const client = await pool.connect();
            try {
                const pgRes = await client.query("SELECT current_user, current_database(), now();");
                results.pg = `OK (${pgRes.rows[0].current_user})`;

                const tables = await client.query("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'");
                results.schema = `${tables.rows[0].count} tables found.`;
            } finally {
                client.release();
            }
        } catch (e: any) {
            results.pg = `ERROR: ${e.message}`;
        } finally {
            await pool.end();
        }

        return {
            results,
            dbUrl: url.replace(/:[^:@]+@/, ':****@')
        };
    }

    private async runNuke(): Promise<{ message: string }> {
        const pool = this.getPool();
        const client = await pool.connect();
        try {
            await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
            await client.query('CREATE SCHEMA public;');
            await client.query('GRANT ALL ON SCHEMA public TO squarecloud;');
        } finally {
            client.release();
            await pool.end();
        }
        return { message: "Nuked." };
    }

    private runMigrate(url: string): { message: string, output: string } {
        try {
            const output = execSync(`npx prisma migrate deploy --schema=prisma/schema.prisma`, {
                env: { ...process.env, DATABASE_URL: url },
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024 // 10MB
            });
            return { message: "Migrated successfully", output };
        } catch (migrateErr: any) {
            throw new Error(`Migrate failed: ${migrateErr.stdout?.toString() || migrateErr.message}`);
        }
    }

    private async runSync(url: string): Promise<{ message: string, tablesCreated: number }> {
        // 1. Force Generate
        execSync(`npx prisma generate --schema=prisma/schema.prisma`, {
            env: { ...process.env, DATABASE_URL: url },
            encoding: 'utf8'
        });

        // 2. DB PUSH
        try {
            execSync(`npx prisma db push --accept-data-loss --schema=prisma/schema.prisma`, {
                env: { ...process.env, DATABASE_URL: url },
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024
            });
        } catch (e) {
            console.warn("Fallback to Diff...");
        }

        // 3. Restore Data
        try {
            execSync('npx tsx src/scripts/restore-from-backup.ts', {
                env: { ...process.env, DATABASE_URL: url },
                encoding: 'utf8',
                maxBuffer: 20 * 1024 * 1024 // 20MB
            });
        } catch (e) {
            console.error("Restore failed.");
        }

        const pool = this.getPool();
        const client = await pool.connect();
        try {
            const { rowCount } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
            return { message: "Sync finished (v102)", tablesCreated: rowCount || 0 };
        } finally {
            client.release();
            await pool.end();
        }
    }

    private getPool(): Pool {
        const config = this.buildPoolConfig(this.dbUrl);
        return new Pool(config);
    }

    private buildPoolConfig(url: string): PoolConfig {
        try {
            const u = new URL(url);
            return {
                user: u.username,
                password: decodeURIComponent(u.password),
                host: u.hostname,
                port: parseInt(u.port),
                database: 'gestaodb',
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 15000,
                idleTimeoutMillis: 30000,
                max: 1
            };
        } catch (e) {
            return { connectionString: url, ssl: { rejectUnauthorized: false } };
        }
    }

    private buildChildProcessUrl(url: string): string {
        try {
            const u = new URL(url.replace(/['"]/g, ""));
            if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres" || u.pathname.toLowerCase() === "/squarecloud") {
                u.pathname = "/gestaodb";
                u.searchParams.set('schema', 'public');
            }
            u.searchParams.set('sslmode', 'require');
            return u.toString();
        } catch (e) {
            return url;
        }
    }
}
