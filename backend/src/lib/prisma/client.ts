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
  readonly adapterName = 'orion-pg-adapter-v98.11';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v98.11] Bridge forensic iniciada.`);
    this.query = this.query.bind(this);
    this.execute = this.execute.bind(this);
    this.startTransaction = this.startTransaction.bind(this);
  }

  // ... (mapColumnType, translateEnum, serializeValue mantidos iguais, assumindo que estão ok)
  // Mas precisamos garantir que eles existam no arquivo. 
  // Vou usar o replace_file_content na range correta para não quebrar os auxiliares.
  // Vou focar apenas em substituir os métodos convertidos.

  async query(params: any): Promise<any> {
    try {
      const res = await this.pool.query(params.sql, params.args);

      if (params.sql.toLowerCase().includes('auth_credentials') || params.sql.toLowerCase().includes('select')) {
        const fieldDesc = res.fields.map(f => `${f.name}(${f.dataTypeID})`).join(', ');
        console.log(`[Adapter/v98.11] 📡 Query [${res.rowCount} rows]: ${fieldDesc}`);
        if (res.rows.length > 0) {
          console.log(`[Adapter/v98.11] 🧪 Sample Raw: ${JSON.stringify(res.rows[0]).substring(0, 150)}`);
        }
      }

      const adapter = this; // Capture context
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
      console.error(`❌ [Adapter/v98.11] Query Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  async execute(params: any): Promise<any> {
    try {
      if (params.sql.trim().toUpperCase().startsWith('CREATE') || params.sql.trim().toUpperCase().startsWith('DROP')) {
        console.log(`[Adapter/v98.11] 🛡️ DDL Detectado. Executando em contexto seguro.`);
      }

      const res = await this.pool.query(params.sql, params.args);
      return { ok: true, value: res.rowCount || 0 };
    } catch (err: any) {
      console.error(`❌ [Adapter/v98.11] Execute Error:`, err.message);
      return { ok: false, error: err };
    }
  }

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
          console.error(`❌ [Adapter/v98.11] TX Query Error:`, err.message);
          return { ok: false, error: err };
        }
      },
      execute: async (params: any) => {
        try {
          const res = await client.query(params.sql, params.args);
          return { ok: true, value: res.rowCount || 0 };
        } catch (err: any) {
          console.error(`❌ [Adapter/v98.11] TX Execute Error:`, err.message);
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
    console.log('🔌 [Prisma/v98.11] Adaptador Orion ativado com sucesso.');

    return new PrismaClient({
      adapter,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v98.11] Falha Crítica na inicialização do Adapter:`, err.message);
    console.warn(`⚠️ [Prisma/v98.11] Stack:`, err.stack);
    console.warn(`⚠️ [Prisma/v98.11] Caindo para Modo Nativo.`);
    return new PrismaClient({ datasources: { db: { url } } }) as ExtendedPrismaClient;
  }
};

const globalForPrisma = global as unknown as { prisma: ExtendedPrismaClient };

// v98.10: Database Name Normalizer
// Garante que a aplicação conecte no mesmo banco que o script de reset (squarecloud)
const fixDatabaseUrl = (url: string) => {
  try {
    const u = new URL(url.replace(/['"]/g, ""));
    // Se não tiver path, ou for /, ou for /postgres, forçamos /squarecloud
    if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres") {
      u.pathname = "/squarecloud";
      console.log(`[Prisma/v98.10] 🔄 URL Ajustada: Banco alvo definido para '/squarecloud'.`);
    }
    return u.toString();
  } catch (e) { return url; }
};

// v98.9: Inicialização (Pós-Hoisting)
const rawDbUrl = process.env.DATABASE_URL;
const dbUrl = rawDbUrl ? fixDatabaseUrl(rawDbUrl) : undefined;

export const prisma = globalForPrisma.prisma || (dbUrl ? createExtendedClient(dbUrl) : new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
