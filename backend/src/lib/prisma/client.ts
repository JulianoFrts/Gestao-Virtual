import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

// v100: Definitive ESM Pool Destructuring
const { Pool } = pg;

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
// Custom Adapter Removido em favor do oficial v6.3.0

// v100: SSL Config with Pure Absolute Paths
function getSSLConfig(connectionString: string) {
  let sslConfig: any = { rejectUnauthorized: false };

  try {
    // Square Cloud Definitive Paths
    const cert = '/application/backend/certificates/certificate.pem';
    const key = '/application/backend/certificates/private-key.key';
    const ca = '/application/backend/certificates/ca-certificate.crt';

    if (fs.existsSync(cert) && fs.existsSync(key)) {
      sslConfig.cert = fs.readFileSync(cert, 'utf8');
      sslConfig.key = fs.readFileSync(key, 'utf8');
      console.log(`🛡️ [Prisma/v100] mTLS Identidade Carregada: ${cert}`);

      if (fs.existsSync(ca)) {
        sslConfig.ca = fs.readFileSync(ca, 'utf8');
        console.log(`📜 [Prisma/v100] CA Bundle Carregado: ${ca}`);
      }
    } else {
      console.warn(`⚠️ [Prisma/v100] Certificados mTLS ausentes em /application/backend/certificates/`);
    }
  } catch (e: any) {
    console.warn(`⚠️ [Prisma/v100] Erro ao preparar SSL:`, e.message);
  }
  return sslConfig;
}

// v99.3: Factory com Configuração Híbrida
const createExtendedClient = (url: string) => {
  try {
    // v102: Official PrismaPg Adapter (Stable)
    console.log('🔌 [Prisma/v102] Inicializando Prisma Client com Adapter...');

    const ssl = getSSLConfig(url);
    const pool = new Pool({
      connectionString: url,
      ssl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    const adapter = new PrismaPg(pool);

    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"]
    }) as unknown as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v102] Factory FALLBACK:`, err.message);

    // v102: Ghost Strategy - Inject mTLS params into URL for native engine fallback
    const cert = "/application/backend/certificates/certificate.pem";
    const key = "/application/backend/certificates/private-key.key";
    const ca = "/application/backend/certificates/ca-certificate.crt";

    const u = new URL(url);
    u.searchParams.set('sslmode', 'verify-ca');
    u.searchParams.set('sslcert', cert);
    u.searchParams.set('sslkey', key);
    u.searchParams.set('sslrootcert', ca);

    return new PrismaClient({
      datasources: { db: { url: u.toString() } }
    }) as unknown as ExtendedPrismaClient;
  }
};

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClient
  on(event: string, listener: (...args: any[]) => void): any;
  addListener(event: string, listener: (...args: any[]) => void): any;
  removeListener(event: string, listener: (...args: any[]) => void): any;
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

    // v99.18: No Downgrade. mTLS is mandatory for 'squarecloud' user identification.
    if (u.searchParams.has('sslmode') && u.searchParams.get('sslmode') === 'verify-ca') {
      console.log(`[Prisma/v99.18] 🛡️ Mantendo mTLS na URL: verify-ca.`);
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
