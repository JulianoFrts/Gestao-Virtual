import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// v151: Naked Prisma (Reverting to v142 Success Pattern)
// Removendo schema=public forçado para evitar "denied access".
export type ExtendedPrismaClient = PrismaClient;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

export class PrismaClientBuilder {
  private static instance: ExtendedPrismaClient;

  private static normalizeUrl(url: string): string {
    if (!url) return "";
    try {
      const u = new URL(url.replace(/['"]/g, ""));
      if (!u.port) {
        const envPort = process.env.PGPORT || process.env.DB_PORT;
        if (envPort) u.port = envPort;
      }

      u.pathname = "/squarecloud";

      // v161: Forçando schema=public agressivamente para visibilidade das tabelas
      u.searchParams.set('schema', 'public');
      u.searchParams.set('sslmode', 'verify-ca');

      const isSquare = fs.existsSync('/application');
      const baseDir = isSquare ? '/application/backend' : process.cwd();

      const getCertPath = (name: string) => {
        const rootPath = path.join(baseDir, name);
        const subPath = path.join(baseDir, 'certificates', name);
        const certDir = path.join(baseDir, 'backend', 'certificates', name);

        if (fs.existsSync(rootPath)) return rootPath;
        if (fs.existsSync(subPath)) return subPath;
        if (fs.existsSync(certDir)) return certDir;
        return name;
      };

      // v151: Usando nomes extraídos pelo script de boot (client.crt, etc)
      u.searchParams.set('sslcert', getCertPath('client.crt'));
      u.searchParams.set('sslkey', getCertPath('client.key'));
      u.searchParams.set('sslrootcert', getCertPath('ca.crt'));

      return u.toString();
    } catch (ignore) {
      return url;
    }
  }

  public static build(): ExtendedPrismaClient {
    if (this.instance) return this.instance;

    const rawUrl = process.env.DATABASE_URL || "";
    const normalizedUrl = this.normalizeUrl(rawUrl);

    try {
      console.log(`🔌 [Prisma/v165] Schema Force Active (public).`);

      const client = new PrismaClient({
        datasources: { db: { url: normalizedUrl } },
        log: ["error"]
      });

      this.instance = client as any;
      return this.instance;
    } catch (err: any) {
      console.error(`🚨 [Prisma/v151] Initialization error:`, err.message);
      return new PrismaClient() as any;
    }
  }
}

const globalForPrisma = global as unknown as { prisma: ExtendedPrismaClient }
export const prisma = globalForPrisma.prisma || PrismaClientBuilder.build();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
