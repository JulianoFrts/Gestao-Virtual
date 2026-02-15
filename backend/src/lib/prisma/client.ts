import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

// v111: Definitive Fix (Bind Resolution + search_path Force)
export class PrismaClientBuilder {
  private static instance: ExtendedPrismaClient;

  /**
   * Extrai e valida credenciais brutas das variáveis de ambiente
   */
  private static getEnvCredentials() {
    let dbName = process.env.PGDATABASE || "squarecloud";
    if (dbName === "postgres" || dbName === "gestao_db") dbName = "squarecloud";

    return {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: parseInt(process.env.PGPORT || "7135"),
      database: dbName,
    };
  }

  /**
   * Normaliza a DATABASE_URL para garantir schema=public
   */
  private static normalizeUrl(url: string): string {
    try {
      let cleanUrl = url.replace(/['"]/g, "");
      const u = new URL(cleanUrl);

      // Forçar Banco 'squarecloud'
      if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres" || u.pathname.toLowerCase() === "/gestao_db") {
        u.pathname = "/squarecloud";
      }

      u.searchParams.set('schema', 'public');
      return u.toString();
    } catch {
      return url;
    }
  }

  /**
   * Prepara mTLS com SNI
   */
  private static getSSLConfig(url: string) {
    let sslConfig: any = { rejectUnauthorized: false };
    try {
      const u = new URL(url);
      sslConfig.servername = u.hostname;

      const certDirs = [
        '/application/backend/certificates',
        '/application/backend',
        process.cwd()
      ];

      for (const dir of certDirs) {
        const cert = path.join(dir, 'certificate.pem');
        const key = path.join(dir, 'private-key.key');
        const ca = path.join(dir, 'ca-certificate.crt');

        // Fallback names
        const cert2 = path.join(dir, 'client.crt');
        const key2 = path.join(dir, 'client.key');
        const ca2 = path.join(dir, 'ca.crt');

        if (fs.existsSync(cert) && fs.existsSync(key)) {
          sslConfig.cert = fs.readFileSync(cert);
          sslConfig.key = fs.readFileSync(key);
          if (fs.existsSync(ca)) sslConfig.ca = fs.readFileSync(ca);
          console.log(`🛡️ [v111] mTLS Bound from: ${dir}`);
          break;
        } else if (fs.existsSync(cert2) && fs.existsSync(key2)) {
          sslConfig.cert = fs.readFileSync(cert2);
          sslConfig.key = fs.readFileSync(key2);
          if (fs.existsSync(ca2)) sslConfig.ca = fs.readFileSync(ca2);
          console.log(`🛡️ [v111] mTLS Bound (Client Names) from: ${dir}`);
          break;
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ [v111] SSL Config Error:`, e.message);
    }
    return sslConfig;
  }

  public static build(): ExtendedPrismaClient {
    if (this.instance) return this.instance;

    const rawUrl = process.env.DATABASE_URL || "";
    const url = this.normalizeUrl(rawUrl);
    const creds = this.getEnvCredentials();

    try {
      console.log(`🔌 [Prisma/v111] Initializing Secure Adapter...`);

      const PoolConstructor = (pg as any).Pool || (pg as any).default?.Pool || pg;
      const ssl = this.getSSLConfig(url);

      const poolConfig: any = {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        ssl,
        // 🔥 v111: Forçar search_path diretamente no driver PG para matar o P1010
        options: "-c search_path=public"
      };

      if (creds.host && creds.user) {
        console.log(`📡 [v111] Mode: Atomic Envs (${creds.host})`);
        Object.assign(poolConfig, {
          user: creds.user,
          password: creds.password,
          host: creds.host,
          port: creds.port,
          database: creds.database
        });
      } else {
        console.log(`📡 [v111] Mode: Integrated URL`);
        poolConfig.connectionString = url;
      }

      const pool = new PoolConstructor(poolConfig);
      const adapter = new PrismaPg(pool);

      const client = new PrismaClient({
        adapter: adapter as any,
        log: ["error"]
      });

      this.instance = createPrismaProxyV111(client);
      return this.instance;
    } catch (err: any) {
      console.error(`🚨 [Prisma/v111] Critical Failure during build:`, err.message);
      return new PrismaClient({ datasources: { db: { url } } }) as any;
    }
  }
}

/**
 * Proxy v111: Resolves 'bind' issues by being non-intrusive on internal symbols
 */
function createPrismaProxyV111(client: any): any {
  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop];

      // Proteção v111: Deixa passar tudo que for interno do Prisma ou não for objeto/fn
      if (typeof prop === 'symbol' || prop.toString().startsWith('$') || prop.toString().startsWith('_')) {
        return value;
      }

      // Se for um modelo do Prisma (ex: client.user), criamos um sub-proxy para as operações
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return new Proxy(value, {
          get(modelTarget, modelProp) {
            const modelValue = modelTarget[modelProp];

            if (typeof modelValue === 'function') {
              return async (...args: any[]) => {
                try {
                  // v111: Executa a operação com contexto original (sem mexer em bind se não necessário)
                  return await modelValue.apply(modelTarget, args);
                } catch (err: any) {
                  console.error(`❌ [PrismaProxy/v111] Operation Error (${prop.toString()}.${modelProp.toString()}):`, err.message);
                  throw err;
                }
              };
            }
            return modelValue;
          }
        });
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
