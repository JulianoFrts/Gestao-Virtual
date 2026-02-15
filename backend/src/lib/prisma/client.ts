import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

// Estender o tipo do PrismaClient para incluir os novos modelos se o gerador falhar no reconhecimento
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
 * Instância singleton do Prisma Client
 */
// Instância singleton do Prisma Client
const createPrismaClient = () => {
  // v50: Proxy robusto para fase de build (evita ReferenceError)
  if (process.env.PRISMA_IGNORE_CONNECTION === 'true') {
    console.log('🛡️ [Prisma] Modo Build: Ativando Proxy de Segurança (Bypass de Conexão).');
    return new Proxy({}, {
      get: () => {
        return new Proxy(() => { }, {
          get: () => () => Promise.resolve([]),
          apply: () => new Proxy({}, { get: () => () => Promise.resolve([]) })
        });
      }
    }) as any;
  }

  const connectionString = process.env.DATABASE_URL?.replace(/['"]/g, "");

  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL não definida. Retornando cliente vazio para fase de build.");
    return {} as any;
  }

  // A função createPrismaClient agora é um wrapper para lidar com fallbacks
  return buildPrismaWithFallback(connectionString);
};

const buildPrismaWithFallback = (url: string) => {
  const maskedOriginal = url.split('@')[1] || 'oculta';
  console.log(`[Prisma/v81] Inicializando cliente com URL: ${maskedOriginal}`);

  const sslConfig = getSSLConfig(url);

  // v81: Conexão Simplificada usando connectionString nativa do pg Pool
  // Prioridade para variáveis de ambiente específicas se definidas
  const poolConfig: any = {
    connectionString: url,
    ssl: sslConfig,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
  };

  const getEnv = (key: string) => {
    const val = process.env[key];
    return (val && val !== 'undefined' && val !== 'null') ? val : null;
  };

  if (getEnv('PGHOST')) poolConfig.host = getEnv('PGHOST');
  if (getEnv('PGUSER')) poolConfig.user = getEnv('PGUSER');
  if (getEnv('PGPASSWORD')) poolConfig.password = getEnv('PGPASSWORD');
  if (getEnv('PGPORT')) poolConfig.port = parseInt(getEnv('PGPORT')!, 10);
  if (getEnv('PGDATABASE')) poolConfig.database = getEnv('PGDATABASE');

  console.log(`[Prisma/v81] Pool Atômico configurado via connectionString.`);
  const pool = new pg.Pool(poolConfig);

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: ["error"],
  } as any) as ExtendedPrismaClient;

  return client;
};

const getPrisma = () => {
  // Memoização robusta para evitar múltiplas instâncias
  if (!(globalThis as any).prismaInstance) {
    (globalThis as any).prismaInstance = createPrismaClient();
    console.log('💎 [Prisma/v59] Instância Singleton Criada.');
  }
  return (globalThis as any).prismaInstance;
};

// v82: Singleton Proxy Totalmente Lazy, Robusto e com Auto-Healing
export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return (target as any)[prop];
    const p = prop as string;

    // Propriedade especial para diagnóstico
    if (p === '$state') {
      const inst = (globalThis as any).prismaInstance;
      return {
        initialized: !!inst,
        models: inst ? Object.keys(inst).filter(key => !key.startsWith('$')) : [],
        env: {
          hasUrl: !!process.env.DATABASE_URL,
          hasHost: !!process.env.PGHOST
        }
      };
    }

    if (['$$typeof', 'constructor', 'toJSON', 'then', 'inspect'].includes(p)) return undefined;

    try {
      let instance = getPrisma();

      // Auto-healing: se a instância for um objeto vazio, tenta recriar
      if (instance && Object.keys(instance).length === 0 && process.env.DATABASE_URL) {
        console.warn(`🔄 [PrismaProxy] Instância vazia detectada para '${p}'. Tentando reinicializar...`);
        (globalThis as any).prismaInstance = createPrismaClient();
        instance = (globalThis as any).prismaInstance;
      }

      if (!instance) return undefined;

      const value = (instance as any)[p];

      if (value === undefined && !p.startsWith('$')) {
        console.error(`❌ [PrismaProxy] Model '${p}' não encontrado na instância. Disponíveis:`,
          Object.keys(instance).filter(k => !k.startsWith('$')).join(', '));
      }

      if (typeof value === 'function') {
        return (...args: any[]) => value.apply(instance, args);
      }

      return value;
    } catch (err: any) {
      console.error(`❌ [PrismaProxy] Erro de acesso em '${p}':`, err.message);
      return undefined;
    }
  }
}) as ExtendedPrismaClient;

export default prisma;

const getSSLConfig = (connectionString: string) => {
  let sslConfig: any = false;

  // v65: Suporte expandido para verify-ca e verify-full
  if (connectionString.includes('sslmode=require') ||
    connectionString.includes('sslmode=verify-full') ||
    connectionString.includes('sslmode=verify-ca')) {

    sslConfig = {
      rejectUnauthorized: false,
    };

    const certsRoot = process.env.CERT_PATH_ROOT || '/application';
    console.log(`🔍 [Prisma/v78] Configurando mTLS Master. Path: ${certsRoot}`);

    // v72: Busca simplificada e robusta na raiz
    const paths = {
      ca: [path.join(certsRoot, 'ca.crt'), process.env.PGSSLROOTCERT],
      cert: [path.join(certsRoot, 'client.crt'), process.env.PGSSLCERT],
      key: [path.join(certsRoot, 'client.key'), process.env.PGSSLKEY]
    };

    const findFirst = (list: (string | undefined)[], label: string) => {
      const found = list.find(p => {
        if (!p) return false;
        const exists = fs.existsSync(p);
        if (exists) {
          console.log(`📍 [Prisma/v65] ${label} encontrado: ${p}`);
        }
        return exists;
      });
      return found;
    };

    const caPath = findFirst(paths.ca, 'CA');
    const certPath = findFirst(paths.cert, 'Cert');
    const keyPath = findFirst(paths.key, 'Key');

    if (caPath) {
      sslConfig.ca = fs.readFileSync(caPath, 'utf8');
      console.log('📦 [Prisma/mTLS] CA Root carregada.');
    }

    if (certPath && keyPath) {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
      console.log('🛡️ [Prisma/mTLS] Cert + Key carregados.');
    } else {
      console.warn('⚠️ [Prisma/mTLS] Identidade incompleta nos caminhos verificados.');
    }
  }
  return sslConfig;
}

/**
 * Verificação robusta com fallback
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
  dbName?: string;
}> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latency: Date.now() - startTime };
  } catch (error: any) {
    // Se o erro for "database not available" e tivermos fallback
    if ((error.message.includes('not available') || error.code === '3D000') && process.env.DATABASE_URL_FALLBACK) {
      console.warn(`⚠️ Banco principal indisponível. Tentando fallback para 'postgres'...`);
      try {
        // Tentativa bruta via pool direta (já que o Prisma está amarrado ao adapter original)
        const fallbackPool = new pg.Pool({
          connectionString: process.env.DATABASE_URL_FALLBACK,
          ssl: getSSLConfig(process.env.DATABASE_URL_FALLBACK)
        });
        const res = await fallbackPool.query('SELECT current_database()');
        return {
          connected: true,
          error: `Conectado via FALLBACK. Banco original falhou: ${error.message}`,
          dbName: res.rows[0].current_database
        };
      } catch (fallbackErr: any) {
        return { connected: false, error: `Falha no banco e no fallback: ${fallbackErr.message}` };
      }
    }
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Função para desconectar do banco de dados
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
