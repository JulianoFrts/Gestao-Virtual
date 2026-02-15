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
  readonly flavour = 'postgres';
  readonly provider = 'postgres'; // Compatibility
  readonly adapterName = 'orion-pg-adapter-v99.1';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v99.1] Bridge forensic iniciada.`);
  }

  // Métodos Auxiliares
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
        if (mapped) return mapped;
      }
    }
    return val;
  }

  private serializeValue(val: any, oid: number, fieldName: string): any {
    if (val === null || val === undefined) return null;

    if (typeof val === 'string' && val.trim().length === 1) {
      console.log(`[Adapter/v98.12] 🛡️ INTERCEPT: [${fieldName}] Raw='${val}' OID=${oid}`);
    }

    const translated = this.translateEnum(fieldName, val);
    return translated;
  }

  // Implementação da Interface DriverAdapter (Arrow Functions)
  query = async (params: any): Promise<any> => {
    try {
      const res = await this.pool.query(params.sql, params.args);

      if (params.sql.toLowerCase().includes('auth_credentials') || params.sql.toLowerCase().includes('select')) {
        const fieldDesc = res.fields.map(f => `${f.name}(${f.dataTypeID})`).join(', ');
        // console.log(`[Adapter/v98.12] 📡 Query [${res.rowCount} rows]: ${fieldDesc}`);
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
      console.error(`❌ [Adapter/v98.12] Query Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  execute = async (params: any): Promise<any> => {
    try {
      if (params.sql.trim().toUpperCase().startsWith('CREATE') || params.sql.trim().toUpperCase().startsWith('DROP')) {
        console.log(`[Adapter/v98.12] 🛡️ DDL Detectado.`);
      }
      const res = await this.pool.query(params.sql, params.args);
      return { ok: true, value: res.rowCount || 0 };
    } catch (err: any) {
      console.error(`❌ [Adapter/v98.12] Execute Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  startTransaction = async () => {
    const client = await this.pool.connect();
    const adapter = this;

    try {
      await client.query('BEGIN');
    } catch (err) {
      client.release();
      throw err;
    }

    return {
      pk: '',
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
          return { ok: false, error: err };
        }
      },
      execute: async (params: any) => {
        try {
          const res = await client.query(params.sql, params.args);
          return { ok: true, value: res.rowCount || 0 };
        } catch (err: any) {
          return { ok: false, error: err };
        }
      },
      commit: async () => {
        try { await client.query('COMMIT'); } finally { client.release(); }
        return { ok: true, value: undefined };
      },
      rollback: async () => {
        try { await client.query('ROLLBACK'); } finally { client.release(); }
        return { ok: true, value: undefined };
      },
      dispose: async () => {
        client.release();
        return { ok: true, value: undefined };
      }
    };
  }

  // Métodos Extras que o Prisma pode estar buscando
  close = async () => {
    // Não fechamos o pool global, mas satisfazemos a interface
    return { ok: true, value: undefined };
  }

  dispose = async () => {
    return { ok: true, value: undefined };
  }

  // Métodos de EventEmitter (Stubbing para Prisma)
  on(event: string, listener: (...args: any[]) => void): this { return this; }
  addListener(event: string, listener: (...args: any[]) => void): this { return this; }
  removeListener(event: string, listener: (...args: any[]) => void): this { return this; }
  emit(event: string, ...args: any[]): boolean { return true; }
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

// v99: Factory com Configuração Segura de SSL
const createExtendedClient = (url: string) => {
  try {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: {
        rejectUnauthorized: false // v99: Aceitar certificado novo do banco recriado
      }
    });

    const adapter = new OrionPgAdapter(pool);
    console.log('🔌 [Prisma/v99] Adaptador Orion ativado com sucesso.');

    return new PrismaClient({
      adapter,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v99] Falha Crítica na inicialização do Adapter:`, err.message);
    console.warn(`⚠️ [Prisma/v99] Stack:`, err.stack);
    console.warn(`⚠️ [Prisma/v99] Caindo para Modo Nativo.`);
    // Fallback Native Client também precisa de SSL Bypass se o URL original tiver verify-ca
    return new PrismaClient({
      datasources: { db: { url } }
      // Nota: O Prisma Nativo usa a URL diretamente. Se ela tiver parameters de SSL, ele tenta honrar.
      // O fixDatabaseUrl já mudou para 'require', o que deve ajudar.
    }) as ExtendedPrismaClient;
  }
};

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClient
  on(event: string, listener: (...args: any[]) => void): this;
  addListener(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

// Helper Hoisted
// v99: SSL Bypass (Emergency Protocol)
// A recriação do banco invalidou o CA. Precisamos ignorar a verificação de certificado temporariamente e forçar conexão via squarecloud.
const fixDatabaseUrl = (url: string) => {
  try {
    // Remover aspas extras
    let cleanUrl = url.replace(/['"]/g, "");

    const u = new URL(cleanUrl);

    // 1. Database Name Normalizer
    if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres") {
      u.pathname = "/squarecloud";
      console.log(`[Prisma/v99] 🔄 URL Ajustada: Banco alvo definido para '/squarecloud'.`);
    }

    // 2. SSL CA Bypass (Devido a recriação do banco)
    if (u.searchParams.has('sslmode') && u.searchParams.get('sslmode') === 'verify-ca') {
      u.searchParams.set('sslmode', 'require'); // Downgrade para aceitar self-signed (com rejectUnauthorized=false no pg)
      console.log(`[Prisma/v99.1] 🔓 SSL Downgrade: verify-ca -> require (CA inválido detectado).`);
    }

    // v99.1: Killswitch mTLS (Certificados antigos são inválidos no novo banco)
    if (u.searchParams.has('sslcert')) {
      u.searchParams.delete('sslcert');
      u.searchParams.delete('sslkey');
      u.searchParams.delete('sslrootcert');
      console.log(`[Prisma/v99.1] ✂️ mTLS Removido: Certificados de cliente ignorados para evitar 'unknown ca'.`);
    }

    return u.toString();
  } catch (e) { return url; }
};

// v98.9: Inicialização (Pós-Hoisting)
const rawDbUrl = process.env.DATABASE_URL;
const dbUrl = rawDbUrl ? fixDatabaseUrl(rawDbUrl) : undefined;

export const prisma = globalForPrisma.prisma || (dbUrl ? createExtendedClient(dbUrl) : new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
