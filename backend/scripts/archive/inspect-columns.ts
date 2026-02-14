import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- INSPEÇÃO DE COLUNAS: team_members ---");

  const firstMember = await prisma.teamMember.findFirst();
  console.log("Exemplo de registro TeamMember (Prisma):", firstMember);

  // Também verificar via SQL bruto para ver as colunas reais
  const result = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'team_members'
    `;
  console.log("Colunas Reais (PostgreSQL):", result);

  console.log("\n--- FIM DA INSPEÇÃO ---");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
