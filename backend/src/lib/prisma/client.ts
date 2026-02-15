import { PrismaClient } from "@prisma/client";
import pg from "pg";
import fs from "fs";
import path from "path";

// Tipagem estendida
export type ExtendedPrismaClient = PrismaClient & {
  governanceAuditHistory: any;
  routeHealthHistory: any;
  projectPermissionDelegation: any;
  permissionMatrix: any;
  permissionLevel: any;
  permissionModule: any;
  taskQueue: any;
};

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

/**
 * v98.1: Orion PG Adapter - Forensic Mode
 * Dump total de OIDs e tradução bruta sem filtros.
 */
export class OrionPgAdapter {
  readonly provider = 'postgres';
  readonly adapterName = 'orion-pg-adapter-v98.1';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v98.1] Bridge forensic iniciada.`);
  }

  /**
   * Mapeamento Quaint (Prisma 6)
   * ID 0: Int32, 1: Int64, 2: Float, 3: Double, 4: Numeric, 5: Boolean, 6: Text, 11: Json
   */
  private mapColumnType(oid: number, fieldName?: string): any {
    let kind = 6; // Default Text
    switch (oid) {
      case 16: kind = 5; break; // Bool
      case 21:
      case 23: kind = 0; break; // Int32
      case 20: kind = 1; break; // Int64
      case 700: kind = 2; break; // Float
      case 701: kind = 3; break; // Double
      case 1700: kind = 4; break; // Numeric
      case 114:
      case 3802: kind = 11; break; // Json
      case 1082:
      case 1114:
      case 1184:
      case 2950:
      case 18:
      case 25:
      case 1043: kind = 6; break; // Text/UUID/Date
    }
    return { kind };
  }

  /**
   * v96.5: Universal Enum Bridge
   * Agora converte 'S', 'A', 'U' etc. em QUALQUER campo, 
   * eliminando erros de inconsistência mesmo quando o nome do campo varia.
   */
  private translateEnum(fieldName: string, val: any): any {
    const roleMap: Record<string, string> = {
      'S': 'SUPER_ADMIN',
      'A': 'ADMIN',
      'U': 'USER',
      'W': 'WORKER',
      'T': 'TECHNICIAN',
      'G': 'GUEST',
      'M': 'MANAGER'
    };

    if (typeof val === 'string') {
      const trimmed = val.trim().toUpperCase();
      if (trimmed.length === 1) {
        const mapped = roleMap[trimmed];
        if (mapped) {
          console.log(`[Adapter/v98.1] 🔄 Auto-Tradução Universal: ${fieldName} ('${val}' -> '${mapped}')`);
          return mapped;
        }
      }
    }
    return val;
  }

  private serializeValue(val: any, oid: number, fieldName: string): any {
    if (val === null || val === undefined) return null;

    // Interceptação Forense (v98.1)
    if (typeof val === 'string' && val.trim().length === 1) {
      console.log(`[Adapter/v98.1] 🛡️ INTERCEPT: [${fieldName}] Raw='${val}' OID=${oid}`);
    }

    // Tradução Universal
    const translated = this.translateEnum(fieldName, val);

    // Inspeção Profunda (v98.1)
    if (typeof translated === 'string' && (translated === 'S' || translated === 'A')) {
      console.log(`[Adapter/v98.1] 🔍 Result [${fieldName}]: Value='${translated}' OID=${oid}`);
    }

    // Diagnóstico de Alerta
    if (typeof translated === 'string' && translated.length === 1 && ['S', 'A', 'U'].includes(translated.toUpperCase())) {
      console.log(`[Adapter/v98.1] ⚠️ Alerta Crítico: Valor bruto escapou em '${fieldName}': '${translated}' (OID: ${oid})`);
    }

    // Serialização Quaint (Prisma 6)
    if (oid === 20 || oid === 1700) return translated.toString();
    if (translated instanceof Date) return translated.toISOString();
    if (oid === 16) return !!translated;
    if (oid === 114 || oid === 3802) {
      return typeof translated === 'string' ? translated : JSON.stringify(translated);
    }

    return translated;
  }

  async queryRaw(params: { sql: string; args: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.args);

      // Diagnóstico de Estrutura (v98.1)
      if (params.sql.toLowerCase().includes('auth_credentials') || params.sql.toLowerCase().includes('select')) {
        const fieldDesc = res.fields.map(f => `${f.name}(${f.dataTypeID})`).join(', ');
        console.log(`[Adapter/v98.1] 📡 Query [${res.rowCount} rows]: ${fieldDesc}`);
        if (res.rows.length > 0) {
          console.log(`[Adapter/v98.1] 🧪 Sample Raw: ${JSON.stringify(res.rows[0]).substring(0, 150)}`);
        }
      }

      const rows = res.rows.map(row =>
        res.fields.map(field => {
          const rawValue = (row as any)[field.name];
          return this.serializeValue(rawValue, field.dataTypeID, field.name);
        })
      );

      return {
        ok: true,
        value: {
          columnNames: res.fields.map(f => f.name),
          columnTypes: res.fields.map(f => this.mapColumnType(f.dataTypeID, f.name)),
          rows: rows
        }
      };
    } catch (err: any) {
      console.error(`❌ [Adapter/v98.1] Query Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  async executeRaw(params: { sql: string; args: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.args);
      return { ok: true, value: res.rowCount || 0 };
    } catch (err: any) {
      console.error(`❌ [Adapter/v98.1] Execute Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  async transactionContext() {
    const client = await this.pool.connect();
    return {
      ok: true,
      value: {
        queryRaw: async (p: any) => {
          const r = await client.query(p.sql, p.args);
          const rows = r.rows.map(row => r.fields.map(f => {
            const raw = (row as any)[f.name];
            const processed = this.serializeValue(raw, f.dataTypeID, f.name);
            // Log extra para transações
            if (typeof processed === 'string' && processed.length === 1) {
              console.log(`[Adapter/v96.6] (TX) 🔍 Inspect [${f.name}]: Value='${processed}' OID=${f.dataTypeID}`);
            }
            return processed;
          }));
          return {
            ok: true,
            value: {
              columnNames: r.fields.map(f => f.name),
              columnTypes: r.fields.map(f => this.mapColumnType(f.dataTypeID, f.name)),
              rows: rows
            }
          };
        },
        executeRaw: async (p: any) => {
          const r = await client.query(p.sql, p.args);
          return { ok: true, value: r.rowCount || 0 };
        },
        commit: async () => { await client.query('COMMIT'); client.release(); },
        rollback: async () => { await client.query('ROLLBACK'); client.release(); }
      }
    };
  }
}

const buildPrismaWithFallback = (url: string) => {
  const sslConfig = getSSLConfig(url);
  const getEnv = (key: string) => {
    const val = process.env[key];
    return (val && val !== 'undefined' && val !== 'null') ? val : null;
  };

  const poolConfig: any = {
    connectionString: url,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 15
  };

  if (getEnv('PGHOST')) poolConfig.host = getEnv('PGHOST');
  if (getEnv('PGUSER')) poolConfig.user = getEnv('PGUSER');
  if (getEnv('PGPASSWORD')) poolConfig.password = getEnv('PGPASSWORD');
  if (getEnv('PGPORT')) poolConfig.port = parseInt(getEnv('PGPORT')!, 10);
  if (getEnv('PGDATABASE')) poolConfig.database = getEnv('PGDATABASE');

  try {
    const pool = new pg.Pool(poolConfig);
    const adapter = new OrionPgAdapter(pool);
    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v98.1] Falha Crítica. Usando Modo Nativo.`);
    return new PrismaClient({ datasources: { db: { url } } }) as ExtendedPrismaClient;
  }
};

const getPrisma = () => {
  if (!(globalThis as any).prismaInstance) {
    const url = (process.env.DATABASE_URL || '').replace(/['"]/g, "");
    if (!url) return {} as any;
    (globalThis as any).prismaInstance = buildPrismaWithFallback(url);
  }
  return (globalThis as any).prismaInstance;
};

export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return (target as any)[prop];
    const p = prop as string;
    if (p === '$state') return { v: "97.0", status: (globalThis as any).prismaInstance ? 'active' : 'idle' };
    if (['$$typeof', 'constructor', 'toJSON', 'then', 'inspect'].includes(p)) return undefined;

    try {
      const instance = getPrisma();
      if (!instance) return undefined;
      const value = (instance as any)[p];
      if (typeof value === 'function') {
        return (...args: any[]) => value.apply(instance, args);
      }
      return value;
    } catch (err: any) {
      console.error(`❌ [Prisma/v98.1] Proxy Error '${p}':`, err.message);
      return undefined;
    }
  }
}) as ExtendedPrismaClient;

export default prisma;

const getSSLConfig = (connectionString: string) => {
  let sslConfig: any = false;
  if (connectionString.includes('sslmode')) {
    sslConfig = { rejectUnauthorized: false };
    const certsRoot = '/application/backend';
    const findPath = (f: string) => [path.join(certsRoot, f), path.join('/application', f)].find(p => fs.existsSync(p));
    const ca = findPath('ca.crt');
    if (ca) sslConfig.ca = fs.readFileSync(ca, 'utf8');
    const cert = findPath('client.crt');
    const key = findPath('client.key');
    if (cert && key) {
      sslConfig.cert = fs.readFileSync(cert, 'utf8');
      sslConfig.key = fs.readFileSync(key, 'utf8');
      console.log('🛡️ [Prisma/v98.1] mTLS v98.1 Ativo.');
    }
  }
  return sslConfig;
}

export async function checkDatabaseConnection() {
  try {
    const res = await (prisma as any).$queryRaw`SELECT 1`;
    return { connected: !!res };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

export async function disconnectDatabase() {
  const inst = (globalThis as any).prismaInstance;
  if (inst) await inst.$disconnect();
}
