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
 * v98.5: Orion PG Adapter - Forensic Mode
 * Dump total de OIDs e tradução bruta sem filtros.
 */
export class OrionPgAdapter {
  readonly provider = 'postgres';
  readonly adapterName = 'orion-pg-adapter-v98.8';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v98.8] Bridge forensic iniciada.`);
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
          console.log(`[Adapter/v98.5] 🔄 Auto-Tradução Universal: ${fieldName} ('${val}' -> '${mapped}')`);
          return mapped;
        }
      }
    }
    return val;
  }

  private serializeValue(val: any, oid: number, fieldName: string): any {
    if (val === null || val === undefined) return null;

    // Interceptação Forense (v98.6)
    if (typeof val === 'string' && val.trim().length === 1) {
      console.log(`[Adapter/v98.8] 🛡️ INTERCEPT: [${fieldName}] Raw='${val}' OID=${oid}`);
    }

    // Tradução Universal
    const translated = this.translateEnum(fieldName, val);

    // Inspeção Profunda (v98.8)
    if (typeof translated === 'string' && (translated === 'S' || translated === 'A')) {
      console.log(`[Adapter/v98.8] 🔍 Result [${fieldName}]: Value='${translated}' OID=${oid}`);
    }

    // Diagnóstico de Alerta
    if (typeof translated === 'string' && translated.length === 1 && /[A-Z]/.test(translated)) {
      console.log(`[Adapter/v98.8] ⚠️ Alerta Crítico: Valor bruto escapou em '${fieldName}': '${translated}' (OID: ${oid})`);
    }

    // Serialização Quaint (Prisma 6)
    return translated;
  }

  async query(params: any): Promise<any> {
    try {
      const res = await this.pool.query(params.sql, params.args);

      // Diagnóstico de Estrutura (v98.7)
      if (params.sql.toLowerCase().includes('auth_credentials') || params.sql.toLowerCase().includes('select')) {
        const fieldDesc = res.fields.map(f => `${f.name}(${f.dataTypeID})`).join(', ');
        console.log(`[Adapter/v98.7] 📡 Query [${res.rowCount} rows]: ${fieldDesc}`);
        if (res.rows.length > 0) {
          console.log(`[Adapter/v98.7] 🧪 Sample Raw: ${JSON.stringify(res.rows[0]).substring(0, 150)}`);
        }
      }

      return {
        ok: true,
        fields: res.fields.map((field) => ({
          name: field.name,
          columnType: this.mapColumnType(field.dataTypeID, field.name),
        })),
        rows: res.rows.map((row) => {
          const serializedRow: any[] = [];
          for (const field of res.fields) {
            const val = row[field.name];
            serializedRow.push(this.serializeValue(val, field.dataTypeID, field.name));
          }
          return serializedRow;
        }),
      };
    } catch (err: any) {
      console.error(`❌ [Adapter/v98.8] Query Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  async execute(params: any): Promise<any> {
    try {
      // v98.2: Schema Context Shield
      if (params.sql.trim().toUpperCase().startsWith('CREATE') || params.sql.trim().toUpperCase().startsWith('DROP')) {
        console.log(`[Adapter/v98.8] 🛡️ DDL Detectado. Executando em contexto seguro.`);
      }

      const res = await this.pool.query(params.sql, params.args);
      return { ok: true, value: res.rowCount || 0 };
    } catch (err: any) {
      console.error(`❌ [Adapter/v98.8] Execute Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  // v98.8: Interface Correta para Prisma Driver Adapter
  async startTransaction() {
    const client = await this.pool.connect();
    const adapter = this;

    try {
      await client.query('BEGIN');
    } catch (err) {
      client.release();
      throw err;
    }

    return {
      pk: '', // Placeholder
      options: { isolationLevel: 'Serializable', readOnly: false } as any,
      query: async (params: any) => {
        try {
          const res = await client.query(params.sql, params.args);
          return {
            ok: true,
            fields: res.fields.map((field) => ({
              name: field.name,
              columnType: adapter.mapColumnType(field.dataTypeID, field.name),
            })),
            rows: res.rows.map((row) => {
              const serializedRow: any[] = [];
              for (const field of res.fields) {
                const val = row[field.name];
                serializedRow.push(adapter.serializeValue(val, field.dataTypeID, field.name));
              }
              return serializedRow;
            }),
          };
        } catch (err: any) {
          console.error(`❌ [Adapter/v98.8] TX Query Error:`, err.message);
          return { ok: false, error: err };
        }
      },
      execute: async (params: any) => {
        try {
          const res = await client.query(params.sql, params.args);
          return { ok: true, value: res.rowCount || 0 };
        } catch (err: any) {
          console.error(`❌ [Adapter/v98.8] TX Execute Error:`, err.message);
          return { ok: false, error: err };
        }
      },
      commit: async () => {
        try {
          await client.query('COMMIT');
        } finally {
          client.release();
        }
        return { ok: true, value: undefined };
      },
      rollback: async () => {
        try {
          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
        return { ok: true, value: undefined };
      },
      dispose: async () => {
        client.release();
        return { ok: true, value: undefined };
      }
    };
  }
}

// Helper Hoisted
function getSSLConfig(connectionString: string) {
  let sslConfig: any = false;
  if (connectionString && connectionString.includes('sslmode')) {
    sslConfig = { rejectUnauthorized: false };
    const certsRoot = '/application/backend';
    const findPath = (f: string) => {
      const p1 = path.join(certsRoot, f);
      const p2 = path.join('/application', f);
      return fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
    };

    const ca = findPath('ca.crt');
    if (ca) sslConfig.ca = fs.readFileSync(ca, 'utf8');

    const cert = findPath('client.crt');
    const key = findPath('client.key');
    if (cert && key) {
      sslConfig.cert = fs.readFileSync(cert, 'utf8');
      sslConfig.key = fs.readFileSync(key, 'utf8');
      console.log('🛡️ [Prisma/v98.8] mTLS v98.8 Ativo.');
    }
  }
  return sslConfig;
}

const createExtendedClient = (url: string) => {
  try {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: getSSLConfig(url)
    });

    const adapter = new OrionPgAdapter(pool);
    console.log('🔌 [Prisma/v98.8] Adaptador Orion ativado com sucesso.');

    return new PrismaClient({
      adapter,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v98.8] Falha Crítica na inicialização do Adapter:`, err.message);
    console.warn(`⚠️ [Prisma/v98.8] Stack:`, err.stack);
    console.warn(`⚠️ [Prisma/v98.8] Caindo para Modo Nativo.`);
    return new PrismaClient({ datasources: { db: { url } } }) as ExtendedPrismaClient;
  }
};

const globalForPrisma = global as unknown as { prisma: ExtendedPrismaClient };

// v98.7: Inicialização (Pós-Hoisting)
const dbUrl = process.env.DATABASE_URL;

export const prisma = globalForPrisma.prisma || (dbUrl ? createExtendedClient(dbUrl) : new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
