import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

// v110: Absolute P1010 Resolution (Forced Schema + Database Normalization)
export class PrismaClientBuilder {
  private static instance: ExtendedPrismaClient;

  /**
   * Extrai e valida credenciais brutas das variáveis de ambiente
   */
  private static getEnvCredentials() {
    let dbName = process.env.PGDATABASE || "squarecloud";

    // v110: Normalização de Sanidade para o Banco
    if (dbName === "postgres" || dbName === "gestao_db") {
      dbName = "squarecloud";
    }

    return {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: parseInt(process.env.PGPORT || "7135"),
      database: dbName,
    };
  }

  /**
   * Normaliza a DATABASE_URL para evitar erros P1010 e garantir schema correto
   */
  private static normalizeUrl(url: string): string {
    try {
      let cleanUrl = url.replace(/['"]/g, "");
      const u = new URL(cleanUrl);
      const currentPath = u.pathname.toLowerCase();

      // v110: Forçar Banco 'squarecloud' se for um dos bancos de sistema ou padrão
      if (!u.pathname || u.pathname === "/" || currentPath === "/postgres" || currentPath === "/gestao_db") {
        u.pathname = "/squarecloud";
        console.log(`[Prisma/v110] 🔄 Database Normalization: ${currentPath || 'root'} -> squarecloud.`);
      }

      // v110: Forçar Schema 'public' (Essencial para evitar P1010)
      u.searchParams.set('schema', 'public');

      return u.toString();
    } catch {
      return url;
    }
  }

  /**
   * Prepara configuração SSL com mTLS (Binary Buffers + SNI)
   */
  private static getSSLConfig(url: string) {
    let sslConfig: any = { rejectUnauthorized: false };
    try {
      const u = new URL(url);
      sslConfig.servername = u.hostname;

      const paths = [
        { cert: '/application/backend/certificates/certificate.pem', key: '/application/backend/certificates/private-key.key', ca: '/application/backend/certificates/ca-certificate.crt' },
        { cert: '/application/backend/client.crt', key: '/application/backend/client.key', ca: '/application/backend/ca.crt' },
        { cert: path.join(process.cwd(), 'client.crt'), key: path.join(process.cwd(), 'client.key'), ca: path.join(process.cwd(), 'ca.crt') }
      ];

      for (const p of paths) {
        if (fs.existsSync(p.cert) && fs.existsSync(p.key)) {
          sslConfig.cert = fs.readFileSync(p.cert);
          sslConfig.key = fs.readFileSync(p.key);
          if (fs.existsSync(p.ca)) sslConfig.ca = fs.readFileSync(p.ca);
          console.log(`🛡️ [Prisma/v110] mTLS Bound: ${path.basename(p.cert)}`);
          break;
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ [Prisma/v110] SSL Config Warning:`, e.message);
    }
    return sslConfig;
  }

  /**
   * Constrói a instância do Prisma com o Adapter PG oficial
   */
  public static build(): ExtendedPrismaClient {
    if (this.instance) return this.instance;

    const rawUrl = process.env.DATABASE_URL || "";
    const url = this.normalizeUrl(rawUrl);
    const creds = this.getEnvCredentials();

    try {
      console.log(`🔌 [Prisma/v110] Initializing Production Client...`);

      const PoolConstructor = (pg as any).Pool || (pg as any).default?.Pool || pg;
      const ssl = this.getSSLConfig(url);

      const poolConfig: any = {
        max: 20, // Aumentado para produção
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        ssl
      };

      if (creds.host && creds.user) {
        console.log(`📡 [Prisma/v110] Source: Atomic Envs (Host: ${creds.host}, DB: ${creds.database})`);
        Object.assign(poolConfig, {
          user: creds.user,
          password: creds.password,
          host: creds.host,
          port: creds.port,
          database: creds.database
        });
      } else {
        const masked = url.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
        console.log(`📡 [Prisma/v110] Source: DATABASE_URL (${masked})`);
        poolConfig.connectionString = url;
      }

      const pool = new PoolConstructor(poolConfig);
      const adapter = new PrismaPg(pool);

      const client = new PrismaClient({
        adapter: adapter as any,
        log: ["error"]
      });

      this.instance = createRecursivePrismaProxy(client);
      return this.instance;
    } catch (err: any) {
      console.error(`🚨 [Prisma/v110] Critical Failure:`, err.message);
      return new PrismaClient({ datasources: { db: { url } } }) as any;
    }
  }
}

/**
 * Recursive Proxy for Safer Function Wrappers - v110
 */
function createRecursivePrismaProxy(target: any, pathName: string = 'prisma'): any {
  return new Proxy(target, {
    get(obj, prop) {
      const value = obj[prop];
      const propName = prop.toString();

      if (typeof prop === 'symbol' || propName.startsWith('$') || propName.startsWith('_')) {
        return value;
      }

      // Recursão para modelos
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return createRecursivePrismaProxy(value, `${pathName}.${propName}`);
      }

      // Wrapper para funções de banco
      if (typeof value === 'function') {
        const wrapped = async (...args: any[]) => {
          try {
            return await value.apply(obj, args);
          } catch (err: any) {
            console.error(`❌ [PrismaProxy/v110] Error in ${pathName}.${propName}:`, err.message);
            throw err;
          }
        };
        return wrapped;
      }

      return value;
    }
  });
}

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClient
}

export const prisma = globalForPrisma.prisma || PrismaClientBuilder.build();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
