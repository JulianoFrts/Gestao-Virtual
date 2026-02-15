import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

// v100: Definitive ESM Pool Destructuring
const { Pool } = pg;

// Tipagem estendida
export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

/**
 * v98.5: Orion PG Adapter - Forensic Mode
 * Dump total de OIDs e tradução bruta sem filtros.
 */
// Custom Adapter Removido em favor do oficial v6.3.0

// v104: SSL Config with Pure Absolute Paths & Multi-Pattern Fallback
function getSSLConfig(connectionString: string) {
  let sslConfig: any = { rejectUnauthorized: false };

  try {
    // Priority 1: Subdirectory Certificates
    const certDir = '/application/backend/certificates';
    const certPath = path.join(certDir, 'certificate.pem');
    const keyPath = path.join(certDir, 'private-key.key');
    const caPath = path.join(certDir, 'ca-certificate.crt');

    // Priority 2: Root Certificates (Seen in logs)
    const rootCertPath = '/application/backend/client.crt';
    const rootKeyPath = '/application/backend/client.key';
    const rootCaPath = '/application/backend/ca.crt';

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
      if (fs.existsSync(caPath)) sslConfig.ca = fs.readFileSync(caPath, 'utf8');
      console.log(`🛡️ [Prisma/v104] mTLS Carregado (Dir): ${certPath}`);
    } else if (fs.existsSync(rootCertPath) && fs.existsSync(rootKeyPath)) {
      sslConfig.cert = fs.readFileSync(rootCertPath, 'utf8');
      sslConfig.key = fs.readFileSync(rootKeyPath, 'utf8');
      if (fs.existsSync(rootCaPath)) sslConfig.ca = fs.readFileSync(rootCaPath, 'utf8');
      console.log(`🛡️ [Prisma/v104] mTLS Carregado (Root): ${rootCertPath}`);
    } else {
      console.warn(`⚠️ [Prisma/v104] Certificados mTLS ausentes.`);
    }
  } catch (e: any) {
    console.warn(`⚠️ [Prisma/v104] Erro ao preparar SSL:`, e.message);
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

    // 1. Database Name & Schema Normalizer (Fix P1010)
    if (!u.pathname || u.pathname === "/" || u.pathname.toLowerCase() === "/postgres" || u.pathname.toLowerCase() === "/gestao_db") {
      u.pathname = "/squarecloud";
      u.searchParams.set('schema', 'public');
      console.log(`[Prisma/v104] 🔄 URL Ajustada: Banco alvo 'squarecloud', Schema 'public'.`);
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
