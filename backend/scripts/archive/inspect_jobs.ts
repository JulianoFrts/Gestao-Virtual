import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- COLUNAS DA TABELA job_functions ---");
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'job_functions'
    ORDER BY ordinal_position;
  `;
  console.log(JSON.stringify(columns, null, 2));

  console.log("\n--- AMOSTRA DE JobFunctions (5 registros) ---");
  const sample = await prisma.jobFunction.findMany({ take: 5 });
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
