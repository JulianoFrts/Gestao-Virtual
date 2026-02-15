import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import fs from "fs";
import path from "path";

// v114: Resilient PG Import for ESM
const { Pool } = pkg;

export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

// v114: Production Architecture (Resilient Imports + Direct Certs + Proxy)
export class PrismaClientBuilder {
  private static instance: ExtendedPrismaClient;

  /**
   * Resolve certificados mTLS priorizando os nomes usados no probe da SquareCloud
   */
  private static resolveCerts() {
    const certDirs = [
      '/application/backend',
      '/application/backend/certificates',
      process.cwd(),
      path.join(process.cwd(), 'certificates')
    ];

    // v114: Nomes priorizados conforme logs do probe com sucesso
    const files = {
      cert: ['client.crt', 'certificate.pem', 'client-cert.pem'],
      key: ['client.key', 'private-key.key', 'client-key.pem'],
      ca: ['ca.crt', 'ca-certificate.crt', 'ca.pem']
    };

    for (const dir of certDirs) {
      if (!fs.existsSync(dir)) continue;

      const certFile = files.cert.find(f => fs.existsSync(path.join(dir, f)));
      const keyFile = files.key.find(f => fs.existsSync(path.join(dir, f)));
      const caFile = files.ca.find(f => fs.existsSync(path.join(dir, f)));

      if (certFile && keyFile) {
        return {
          certPath: path.join(dir, certFile),
          keyPath: path.join(dir, keyFile),
          caPath: caFile ? path.join(dir, caFile) : undefined,
          dir
        };
      }
    }
    return null;
  }

  private static getEnvCredentials() {
    return {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: parseInt(process.env.PGPORT || "7135"),
      database: process.env.PGDATABASE || "squarecloud",
    };
  }

  private static normalizeUrl(url: string, certs: any): string {
    try {
      let cleanUrl = url.replace(/['"]/g, "");
      const u = new URL(cleanUrl);

      if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres") {
        u.pathname = "/squarecloud";
      }

      // v114: NÃO forçar schema=public se não vier na URL original (evita squarecloud.public confusion)
      u.searchParams.set('sslmode', 'verify-ca');

      if (certs) {
        u.searchParams.set('sslcert', certs.certPath);
        u.searchParams.set('sslkey', certs.keyPath);
        if (certs.caPath) u.searchParams.set('sslrootcert', certs.caPath);
      }

      return u.toString();
    } catch {
      return url;
    }
  }

  public static build(): ExtendedPrismaClient {
    if (this.instance) return this.instance;

    const certs = this.resolveCerts();
    const rawUrl = process.env.DATABASE_URL || "";
    const url = this.normalizeUrl(rawUrl, certs);
    const creds = this.getEnvCredentials();

    try {
      console.log(`🔌 [Prisma/v114] Iniciando Builder (mTLS: ${certs ? 'DETECTADO' : 'NÃO'})`);

      const ssl: any = { rejectUnauthorized: false };
      if (certs) {
        ssl.servername = new URL(url).hostname;
        ssl.cert = fs.readFileSync(certs.certPath);
        ssl.key = fs.readFileSync(certs.keyPath);
        if (certs.caPath) ssl.ca = fs.readFileSync(certs.caPath);
        console.log(`🛡️ [v114] Certificados Ativos: ${path.basename(certs.certPath)}`);
      }

      const poolConfig: any = {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        ssl
      };

      if (creds.host && creds.user) {
        console.log(`📡 [v114] Conectando via Envs (Host: ${creds.host})`);
        Object.assign(poolConfig, {
          user: creds.user,
          password: creds.password,
          host: creds.host,
          port: creds.port,
          database: creds.database
        });
      } else {
        console.log(`📡 [v114] Conectando via URL.`);
        poolConfig.connectionString = url;
      }

      // v114: Uso ultra-seguro do construtor Pool (importante para evitar erro de bind)
      const pool = new Pool(poolConfig);

      const adapter = new PrismaPg(pool);
      const client = new PrismaClient({ adapter: adapter as any, log: ["error"] });

      this.instance = createPrismaProxyV114(client);
      console.log(`✅ [v114] Adaptador PrismaPg Ativo.`);
      return this.instance;
    } catch (err: any) {
      console.error(`🚨 [Prisma/v114] Falha no Builder (Fallback Ativado):`, err.message);
      return new PrismaClient({ datasources: { db: { url } } }) as any;
    }
  }
}

/**
 * Proxy v114: Wrappers de segurança resilientes
 */
function createPrismaProxyV114(client: any): any {
  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop];
      if (typeof prop === 'symbol' || prop.toString().startsWith('$') || prop.toString().startsWith('_')) return value;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return new Proxy(value, {
          get(modelTarget, modelProp) {
            const modelValue = modelTarget[modelProp];
            if (typeof modelValue === 'function') {
              return async (...args: any[]) => {
                try {
                  return await modelValue.apply(modelTarget, args);
                } catch (err: any) {
                  console.error(`❌ [PrismaProxy/v114] Erro em ${prop.toString()}.${modelProp.toString()}:`, err.message);
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

const globalForPrisma = global as unknown as { prisma: ExtendedPrismaClient }
export const prisma = globalForPrisma.prisma || PrismaClientBuilder.build();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
