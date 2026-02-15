import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

// v105: Robust ESM Pool Import
const Pool = pg.Pool || (pg as any).default?.Pool;

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

// v107: SSL Config with SNI & Binary Buffers (Fix Unknown CA)
function getSSLConfig(connectionString: string) {
  let sslConfig: any = { rejectUnauthorized: false };

  try {
    const u = new URL(connectionString);
    sslConfig.servername = u.hostname;

    // Priority 1: Subdirectory Certificates
    const certDir = '/application/backend/certificates';
    const paths = {
      cert: path.join(certDir, 'certificate.pem'),
      key: path.join(certDir, 'private-key.key'),
      ca: path.join(certDir, 'ca-certificate.crt')
    };

    // Priority 2: Root Certificates (Seen in logs)
    const rootPaths = {
      cert: '/application/backend/client.crt',
      key: '/application/backend/client.key',
      ca: '/application/backend/ca.crt'
    };

    const loadCert = (p: any, tag: string) => {
      if (fs.existsSync(p.cert) && fs.existsSync(p.key)) {
        sslConfig.cert = fs.readFileSync(p.cert);
        sslConfig.key = fs.readFileSync(p.key);
        if (fs.existsSync(p.ca)) sslConfig.ca = fs.readFileSync(p.ca);
        console.log(`🛡️ [Prisma/v107] mTLS ${tag} Carregado: ${p.cert}`);
        return true;
      }
      return false;
    };

    if (!loadCert(paths, "Dir") && !loadCert(rootPaths, "Root")) {
      console.warn(`⚠️ [Prisma/v107] Certificados mTLS ausentes.`);
    }
  } catch (e: any) {
    console.warn(`⚠️ [Prisma/v107] Erro ao preparar SSL:`, e.message);
  }
  return sslConfig;
}

// v107: Factory Final (Binary & SNI Protected)
const createExtendedClient = (url: string) => {
  const version = 'v107';
  try {
    console.log(`🔌 [Prisma/${version}] Conectando ao Banco...`);

    const u = new URL(url);
    const ssl = getSSLConfig(url);

    // Garantir que temos o Pool correto via ESM
    const PoolConstructor = (pg as any).Pool || (pg as any).default?.Pool || pg;

    const pool = new PoolConstructor({
      user: u.username,
      password: decodeURIComponent(u.password),
      host: u.hostname,
      port: parseInt(u.port),
      database: u.pathname.substring(1).split('?')[0] || 'squarecloud',
      ssl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000
    });

    // Verificação de saúde do Pool (Prevenir Erro de Bind)
    if (!pool || typeof pool.query !== 'function') {
      throw new Error("Falha na inicialização do Pool (Bind Error)");
    }

    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"]
    }) as unknown as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/${version}] Fallback para Motor Nativo:`, err.message);

    const u = new URL(url);
    u.searchParams.set('sslmode', 'verify-ca');

    const paths = [
      { cert: "/application/backend/certificates/certificate.pem", key: "/application/backend/certificates/private-key.key", ca: "/application/backend/certificates/ca-certificate.crt" },
      { cert: "/application/backend/client.crt", key: "/application/backend/client.key", ca: "/application/backend/ca.crt" }
    ];

    for (const p of paths) {
      if (fs.existsSync(p.cert)) {
        u.searchParams.set('sslcert', p.cert);
        u.searchParams.set('sslkey', p.key);
        u.searchParams.set('sslrootcert', p.ca);
        break;
      }
    }

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
