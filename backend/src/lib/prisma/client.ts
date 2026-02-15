import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

// v109: Advanced Production Architecture (Recursive Proxy + Intelligent Normalization)
export class PrismaClientBuilder {
  private static instance: ExtendedPrismaClient;

  /**
   * Extrai e valida credenciais brutas das variáveis de ambiente
   */
  private static getEnvCredentials() {
    return {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: parseInt(process.env.PGPORT || "5432"),
      database: process.env.PGDATABASE,
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

      // v109: Só normalizamos se for o banco padrão do Postgres que falha na SquareCloud
      if (!u.pathname || u.pathname === "/" || currentPath === "/postgres" || currentPath === "/gestao_db") {
        if (currentPath === "/gestao_db" || !u.pathname || u.pathname === "/") {
          u.pathname = "/squarecloud";
          u.searchParams.set('schema', 'public');
          console.log(`[Prisma/v109] 🔄 Normalização: ${currentPath || 'root'} -> squarecloud/public.`);
        }
      }
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
          console.log(`🛡️ [Prisma/v109] mTLS Ativo: ${path.basename(p.cert)}`);
          break;
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ [Prisma/v109] SSL Config Warning:`, e.message);
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
      console.log(`🔌 [Prisma/v109] Iniciando Builder...`);

      const PoolConstructor = (pg as any).Pool || (pg as any).default?.Pool || pg;
      const ssl = this.getSSLConfig(url);

      // Configuração estruturada do Pool
      const poolConfig: any = {
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        ssl
      };

      if (creds.host && creds.user) {
        console.log(`📡 [Prisma/v109] Usando Credenciais PGHOST: ${creds.host}`);
        Object.assign(poolConfig, {
          user: creds.user,
          password: creds.password,
          host: creds.host,
          port: creds.port,
          database: creds.database
        });
      } else {
        console.log(`📡 [Prisma/v109] Usando URL Completa.`);
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
      console.error(`🚨 [Prisma/v109] Erro Fatal no Builder:`, err.message);
      return new PrismaClient({ datasources: { db: { url } } }) as any;
    }
  }
}

/**
 * Safer Function Wrappers (Recursive Proxy) - v109
 */
function createRecursivePrismaProxy(target: any, pathName: string = 'prisma'): any {
  return new Proxy(target, {
    get(obj, prop) {
      // Evitar receiver no Reflect.get para compatibilidade com internos do Prisma
      const value = obj[prop];
      const propName = prop.toString();

      // Ignorar propriedades internas, Symbols e campos privados do Prisma
      if (typeof prop === 'symbol' || propName.startsWith('$') || propName.startsWith('_')) {
        return value;
      }

      // Se for um modelo (user, authCredential, etc), envolvemos recursivamente
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return createRecursivePrismaProxy(value, `${pathName}.${propName}`);
      }

      // Se for uma função de operação (findUnique, findFirst, etc)
      if (typeof value === 'function') {
        const wrapped = async (...args: any[]) => {
          try {
            return await value.apply(obj, args);
          } catch (err: any) {
            console.error(`❌ [PrismaProxy] Erro em ${pathName}.${propName}:`, err.message);
            throw err;
          }
        };
        // Preserva metadados se necessário
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
