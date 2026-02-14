import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`
        SELECT 
            column_name, 
            data_type, 
            udt_name 
        FROM 
            information_schema.columns 
        WHERE 
            table_name = 'users' AND column_name = 'role';
    `;
  console.log("Column Info:", result);

  try {
    const enumValues = await prisma.$queryRaw`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'Role';
        `;
    console.log("Enum Values:", enumValues);
  } catch (e: any) {
    console.error("Erro ao verificar:", e);
  }
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
