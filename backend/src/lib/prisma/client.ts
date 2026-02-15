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

const createPrismaClient = () => {
  if (process.env.PRISMA_IGNORE_CONNECTION === 'true') {
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
    console.warn("⚠️ DATABASE_URL não definida. Retornando cliente vazio.");
    return {} as any;
  }

  return buildPrismaWithFallback(connectionString);
};

const buildPrismaWithFallback = (url: string) => {
  const maskedOriginal = url.split('@')[1] || 'oculta';
  console.log(`[Prisma/v85] 🚀 Inicializando v85. URL: ${maskedOriginal}`);

  const sslConfig = getSSLConfig(url);

  const poolConfig: any = {
    connectionString: url,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
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

  // TENTA PRIMEIRO COM ADAPTER (MODO RESILIENTE)
  try {
    console.log(`[Prisma/v85] 🔋 Tentando modo ADAPTER (pg pool)...`);
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);

    const client = new PrismaClient({
      adapter,
      log: ["error"],
    } as any);

    // TESTE DE SANIDADE (se falhar aqui, o catch pega)
    // Acessar uma propriedade qualquer para disparar bindings internos
    const _test = (client as any).$connect;

    return client as ExtendedPrismaClient;
  } catch (err: any) {
    console.error(`⚠️ [Prisma/v85] Falha no Modo Adapter (Binding Error). Alternando para MODO NATIVO...`);
    console.error(`🔍 [Prisma/v85] Motivo: ${err.message}`);

    // FALLBACK PARA MODO NATIVO (Prisma gerencia mTLS via URL)
    try {
      const client = new PrismaClient({
        datasources: {
          db: { url: url }
        },
        log: ["error"],
      } as any);
      return client as ExtendedPrismaClient;
    } catch (nativeErr: any) {
      console.error(`❌ [Prisma/v85] Falha CRÍTICA em ambos os modos:`, nativeErr.message);
      throw nativeErr;
    }
  }
};

const getPrisma = () => {
  if (!(globalThis as any).prismaInstance) {
    console.log('💎 [Prisma/v85] Criando Singleton...');
    try {
      const inst = createPrismaClient();
      (globalThis as any).prismaInstance = inst;
      console.log('✅ [Prisma/v85] Singleton Pronto.');
    } catch (e: any) {
      console.error('❌ [Prisma/v85] Falha na criação do Singleton:', e.message);
      return null;
    }
  }
  return (globalThis as any).prismaInstance;
};

export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return (target as any)[prop];
    const p = prop as string;

    if (p === '$state') {
      const inst = (globalThis as any).prismaInstance;
      return { v: "85", init: !!inst, models: inst ? Object.keys(inst).filter(k => !k.startsWith('$')) : [] };
    }

    if (['$$typeof', 'constructor', 'toJSON', 'then', 'inspect'].includes(p)) return undefined;

    try {
      let instance = getPrisma();

      // Se a instância falhou ou está vazia, tenta reinicializar
      if (!instance || (Object.keys(instance).length === 0 && !p.startsWith('$'))) {
        console.warn(`🔄 [Prisma/v85] Instância inválida detectada para '${p}'. Forçando reinicialização...`);
        (globalThis as any).prismaInstance = createPrismaClient();
        instance = (globalThis as any).prismaInstance;
      }

      const value = (instance as any)[p];

      if (typeof value === 'function') {
        return (...args: any[]) => {
          if (!instance) throw new Error("Prisma Instance not available");
          return value.apply(instance, args);
        };
      }

      return value;
    } catch (err: any) {
      console.error(`❌ [Prisma/v85] Erro no Proxy (${p}):`, err.message);
      return undefined;
    }
  }
}) as ExtendedPrismaClient;

export default prisma;

const getSSLConfig = (connectionString: string) => {
  let sslConfig: any = false;

  if (connectionString.includes('sslmode=require') ||
    connectionString.includes('sslmode=verify-full') ||
    connectionString.includes('sslmode=verify-ca')) {

    sslConfig = { rejectUnauthorized: false };

    const certsRoot = process.env.CERT_PATH_ROOT || '/application/backend';
    console.log(`🔍 [Prisma/v85] Verificando SSL em: ${certsRoot}`);

    const paths = {
      ca: [path.join(certsRoot, 'ca.crt'), '/application/ca.crt'],
      cert: [path.join(certsRoot, 'client.crt'), '/application/client.crt'],
      key: [path.join(certsRoot, 'client.key'), '/application/client.key']
    };

    const findFirst = (list: (string | undefined)[]) => list.find(p => p && fs.existsSync(p));

    const caPath = findFirst(paths.ca);
    if (caPath) sslConfig.ca = fs.readFileSync(caPath, 'utf8');

    const certPath = findFirst(paths.cert);
    const keyPath = findFirst(paths.key);
    if (certPath && keyPath) {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
      console.log('🛡️ [Prisma/v85] SSL v85 configurado.');
    }
  }
  return sslConfig;
}

export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
