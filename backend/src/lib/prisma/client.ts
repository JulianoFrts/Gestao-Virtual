import { PrismaClient } from "@prisma/client";

// Estender o tipo do PrismaClient para incluir os novos modelos se o gerador falhar no reconhecimento
export type ExtendedPrismaClient = PrismaClient & {
  governanceAuditHistory: any;
  routeHealthHistory: any;
  projectPermissionDelegation: any;
  permissionMatrix: any;
  permissionLevel: any;
  permissionModule: any;
  taskQueue: any;
  dataIngestion: any;
  activityUnitCost: any;
  activitySchedule: any;
  activityStatus: any;
  productionCategory: any;
  mapElementTechnicalData: any;
  mapElementProductionProgress: any;
  tower: any;
  activity: any;
  project: any;
  towerProduction: any;
  towerConstruction: any;
  towerActivityGoal: any;
};

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn(
      "⚠️ DATABASE_URL não definida. Retornando cliente vazio para fase de build.",
    );
    return new PrismaClient() as ExtendedPrismaClient;
  }

  const maskedOriginal = connectionString.split("@")[1] || "oculta";
  console.log(
    `[Prisma] Inicializando Standard Client (sem Adapter) com URL: ${maskedOriginal}`,
  );

  // O Prisma padrão lê automaticamente a DATABASE_URL do environment.
  // A URL já contém sslmode e caminhos de certificado injetados pelo start.cjs.

  return new PrismaClient({
    log: ["error"],
  }) as ExtendedPrismaClient;
};

// Singleton seguro
const globalForPrisma = global as unknown as { prisma: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (
  (process.env.NODE_ENV as string) !== "production" &&
  (process.env.NODE_ENV as string) !== "remote"
)
  globalForPrisma.prisma = prisma;

export default prisma;

// Funções auxiliares mantidas para compatibilidade
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
  dbName?: string;
}> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latency: Date.now() - startTime };
  } catch (error: any) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
