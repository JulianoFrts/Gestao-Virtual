import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

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

// Helper Hoisted
// v99.10: Helper SSL Robusto (Restored)
function getSSLConfig(connectionString: string) {
  // Sempre começa aceitando certificados inválidos (Servidor Recriado = CA Novo/Desconhecido)
  let sslConfig: any = { rejectUnauthorized: false };

  try {
    const certsRoot = '/application/backend';
    const findPath = (f: string) => {
      const p1 = path.join(certsRoot, 'certificates', f);
      const p2 = path.join(certsRoot, f);
      return fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
    };

    const certPath = findPath('certificate.pem') || findPath('client.crt') || findPath('client.pem');
    const keyPath = findPath('private-key.key') || findPath('client.key') || findPath('private.key');
    const caPath = findPath('ca-certificate.crt') || findPath('ca.crt') || findPath('root.crt');

    if (certPath && keyPath) {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
      console.log(`🛡️ [Prisma/v99.21] mTLS Carregado: ${certPath}`);
      if (caPath) {
        sslConfig.ca = fs.readFileSync(caPath, 'utf8');
        console.log(`📜 [Prisma/v99.21] CA Bundle Carregado: ${caPath}`);
      }
    } else {
      console.warn(`⚠️ [Prisma/v99.21] Certificados não encontrados em ${certsRoot}.`);
    }
  } catch (e) {
    console.warn(`⚠️ [Prisma/v99.10] Erro lendo certificados:`, e);
  }
  return sslConfig;
}

// v99.3: Factory com Configuração Híbrida
const createExtendedClient = (url: string) => {
  try {
    // v99.23: Official PrismaPg Adapter
    console.log('🔌 [Prisma/v99.23] Usando PrismaPg oficial (mTLS Bridge).');

    const ssl = getSSLConfig(url);
    const pool = new pg.Pool({
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
    console.warn(`⚠️ [Prisma/v99.23] Erro fatal na factory:`, err.message);
    return new PrismaClient() as unknown as ExtendedPrismaClient;
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
