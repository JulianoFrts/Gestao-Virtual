import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

// v108: Definitive Production Architecture (Builder + Proxy + mTLS)
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

      // Fix P1010: Forçar squarecloud e public schema se estiver no alvo padrão
      if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres" || u.pathname.toLowerCase() === "/gestao_db") {
        u.pathname = "/squarecloud";
        u.searchParams.set('schema', 'public');
        console.log(`[Prisma/v108] 🔄 URL Normalizada: Banco 'squarecloud', Schema 'public'.`);
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
        { cert: '/application/backend/client.crt', key: '/application/backend/client.key', ca: '/application/backend/ca.crt' }
      ];

      for (const p of paths) {
        if (fs.existsSync(p.cert) && fs.existsSync(p.key)) {
          sslConfig.cert = fs.readFileSync(p.cert);
          sslConfig.key = fs.readFileSync(p.key);
          if (fs.existsSync(p.ca)) sslConfig.ca = fs.readFileSync(p.ca);
          console.log(`🛡️ [Prisma/v108] mTLS Carregado: ${p.cert}`);
          break;
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ [Prisma/v108] SSL Config Warning:`, e.message);
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
      console.log(`🔌 [Prisma/v108] Buildando Cliente (Modo Adapter)...`);

      // Validação de sanidade exigida pelo commit c188ee7
      if (!creds.host || !creds.user || !creds.password) {
        console.warn("⚠️ [Prisma/v108] Credenciais PG parciais no ENV. Usando URL direta.");
      }

      const PoolConstructor = (pg as any).Pool || (pg as any).default?.Pool || pg;
      const ssl = this.getSSLConfig(url);

      // Configuração estruturada do Pool (Evita Erro de Bind)
      const poolConfig: any = {
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        ssl
      };

      if (creds.host && creds.user) {
        Object.assign(poolConfig, {
          user: creds.user,
          password: creds.password,
          host: creds.host,
          port: creds.port,
          database: creds.database
        });
      } else {
        poolConfig.connectionString = url;
      }

      const pool = new PoolConstructor(poolConfig);
      const adapter = new PrismaPg(pool);

      const client = new PrismaClient({
        adapter: adapter as any,
        log: ["error"]
      });

      this.instance = createPrismaProxy(client as any);
      return this.instance;
    } catch (err: any) {
      console.error(`🚨 [Prisma/v108] Erro Fatal no Builder:`, err.message);
      // Fallback de emergência para motor nativo
      return new PrismaClient({ datasources: { db: { url } } }) as any;
    }
  }
}

/**
 * Safer Function Wrappers (Proxy Mode) - Implementação solicitada no commit c188ee7
 */
function createPrismaProxy(client: PrismaClient): ExtendedPrismaClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Interceptamos apenas chamadas de funções para adicionar segurança
      if (typeof value === 'function' && !prop.toString().startsWith('$')) {
        return async (...args: any[]) => {
          try {
            return await value.apply(target, args);
          } catch (err: any) {
            console.error(`❌ [PrismaProxy] Erro na operação ${prop.toString()}:`, err.message);
            throw err;
          }
        };
      }
      return value;
    }
  }) as unknown as ExtendedPrismaClient;
}

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClient
}

export const prisma = globalForPrisma.prisma || PrismaClientBuilder.build();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

