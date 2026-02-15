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
  readonly adapterName = 'orion-pg-adapter-v99.9';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v99.9] Bridge forensic iniciada.`);
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

  // v99.9: Standard Methods (KISS)
  async query(params: any): Promise<any> {
    try {
      const res = await this.pool.query(params.sql, params.args);

      if (params.sql.toLowerCase().includes('auth_credentials') || params.sql.toLowerCase().includes('select')) {
        const fieldDesc = res.fields.map(f => `${f.name}(${f.dataTypeID})`).join(', ');
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
      console.error(`❌ [Adapter/v99.9] Query Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  async execute(params: any): Promise<any> {
    try {
      if (params.sql.trim().toUpperCase().startsWith('CREATE') || params.sql.trim().toUpperCase().startsWith('DROP')) {
        console.log(`[Adapter/v99.9] 🛡️ DDL Detectado.`);
      }
      const res = await this.pool.query(params.sql, params.args);
      return { ok: true, value: res.rowCount || 0 };
    } catch (err: any) {
      console.error(`❌ [Adapter/v99.9] Execute Error:`, err.message);
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
  on = (event: string, listener: (...args: any[]) => void): this => { return this; }
  addListener = (event: string, listener: (...args: any[]) => void): this => { return this; }
  removeListener = (event: string, listener: (...args: any[]) => void): this => { return this; }
  emit = (event: string, ...args: any[]): boolean => { return true; }
}

// Helper Hoisted
// v99.10: Helper SSL Robusto (Restored)
function getSSLConfig(connectionString: string) {
  // Sempre começa aceitando certificados inválidos (Servidor Recriado = CA Novo/Desconhecido)
  let sslConfig: any = { rejectUnauthorized: false };

  try {
    const certsRoot = '/application/backend';
    const findPath = (f: string) => {
      const p1 = path.join(certsRoot, 'certificates', f);
      const p2 = path.join(certsRoot, f);
      return fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
    };

    const certPath = findPath('certificate.pem') || findPath('client.crt');
    const keyPath = findPath('private-key.key') || findPath('client.key');
    const caPath = findPath('ca-certificate.crt') || findPath('ca.crt');

    if (certPath && keyPath) {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
      console.log(`🛡️ [Prisma/v99.10] mTLS Carregado: ${certPath}`);
      if (caPath) {
        sslConfig.ca = fs.readFileSync(caPath, 'utf8');
        console.log(`📜 [Prisma/v99.10] CA Bundle Carregado: ${caPath}`);
      }
    }
  } catch (e) {
    console.warn(`⚠️ [Prisma/v99.10] Erro lendo certificados:`, e);
  }
  return sslConfig;
}

// v99.3: Factory com Configuração Híbrida
const createExtendedClient = (url: string) => {
  try {
    // v99.10: Adapter Disabled (Native Mode Only)
    // O driver adapter customizado está causando conflitos de versão com o Prisma.
    // Usaremos conexão nativa do Prisma, mas precisamos garantir que a URL suporte os certificados.
    console.log('🔌 [Prisma/v99.10] Modo Nativo Forçado (Adapter Desativado).');

    return new PrismaClient({
      datasources: { db: { url } },
      log: ["error"],
    }) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v99] Erro fatal na factory:`, err.message);
    return new PrismaClient() as ExtendedPrismaClient;
  }
};
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
      console.log(`[Prisma/v99.3] 🔓 SSL Downgrade: verify-ca -> require (CA inválido detectado).`);
    }

    // v99.3: Killswitch Removido (mTLS é obrigatório)
    // Mantemos os parâmetros na URL mas o Pool vai usar o config explícito do getSSLConfig também.

    return u.toString();
  } catch (e) { return url; }
};

// v98.9: Inicialização (Pós-Hoisting)
const rawDbUrl = process.env.DATABASE_URL;
const dbUrl = rawDbUrl ? fixDatabaseUrl(rawDbUrl) : undefined;

export const prisma = globalForPrisma.prisma || (dbUrl ? createExtendedClient(dbUrl) : new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
