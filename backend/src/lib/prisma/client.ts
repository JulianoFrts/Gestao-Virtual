import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

// v113: Isolation Mode (No Proxy + ESM Secure Imports)
export class PrismaClientBuilder {
  private static instance: ExtendedPrismaClient;

  /**
   * Resolve caminhos de certificados mTLS (Idêntico ao startup script)
   */
  private static resolveCerts() {
    const certDirs = [
      '/application/backend/certificates',
      '/application/backend',
      process.cwd(),
      path.join(process.cwd(), 'certificates'),
      path.join(process.cwd(), 'backend/certificates')
    ];

    const files = {
      cert: ['certificate.pem', 'client.crt', 'client-cert.pem'],
      key: ['private-key.key', 'client.key', 'client-key.pem'],
      ca: ['ca-certificate.crt', 'ca.crt', 'ca.pem']
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

      // Forçar Database squarecloud se estiver genérico
      if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres") {
        u.pathname = "/squarecloud";
      }

      // Forçar Params críticos
      u.searchParams.set('schema', 'public');
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
      console.log(`🔌 [Prisma/v113] Buildando Cliente (Isolamento Ativo)...`);

      const ssl: any = { rejectUnauthorized: false };
      if (certs) {
        ssl.servername = new URL(url).hostname;
        ssl.cert = fs.readFileSync(certs.certPath);
        ssl.key = fs.readFileSync(certs.keyPath);
        if (certs.caPath) ssl.ca = fs.readFileSync(certs.caPath);
        console.log(`🛡️ [v113] mTLS Detetado em: ${certs.dir}`);
      }

      const poolConfig: any = {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        ssl
      };

      if (creds.host && creds.user) {
        console.log(`📡 [v113] Usando Credenciais Atômicas (DB: ${creds.database})`);
        Object.assign(poolConfig, {
          user: creds.user,
          password: creds.password,
          host: creds.host,
          port: creds.port,
          database: creds.database
        });
      } else {
        console.log(`📡 [v113] Usando URL de Conexão.`);
        poolConfig.connectionString = url;
      }

      console.log(`🔨 [v113] Criando Pool com driver 'pg'...`);
      const pool = new Pool(poolConfig);

      console.log(`🔨 [v113] Criando Adaptador PrismaPg...`);
      const adapter = new PrismaPg(pool);

      console.log(`🔨 [v113] Instanciando PrismaClient...`);
      const client = new PrismaClient({
        adapter: adapter as any,
        log: ["error"]
      });

      // v113: RETORNANDO CLIENTE PURO PARA ISOLAR O ERRO 'BIND'
      console.log(`✅ [v113] Cliente Buildado com Sucesso (Sem Proxy).`);
      this.instance = client as any;
      return this.instance;
    } catch (err: any) {
      console.error(`🚨 [Prisma/v113] Falha no Builder:`, err.message);
      // Fallback nativo com mTLS na URL
      return new PrismaClient({ datasources: { db: { url } } }) as any;
    }
  }
}

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClient
}

export const prisma = globalForPrisma.prisma || PrismaClientBuilder.build();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
