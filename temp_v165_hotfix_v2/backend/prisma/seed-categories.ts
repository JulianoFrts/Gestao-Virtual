import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- SEEDING CATEGORIES AND ACTIVITIES ---");

  // 3. Categorias e Atividades (Idempotente)
  const categoryData = [
    {
      name: "SERVIÇOS PRELIMINARES",
      order: 1,
      activities: [
        { name: "Croqui de Acesso", unit: "KM", price: 5000 },
        { name: "Sondagem", unit: "UN", price: 1250 },
        { name: "Conferência de Perfil", unit: "UN", price: 850 },
        { name: "Supressão Vegetal (Área)", unit: "m²", price: 12.5 },
        { name: "Abertura de Acessos", unit: "UN", price: 4200 },
      ],
    },
    {
      name: "FUNDAÇÕES",
      order: 2,
      activities: [
        { name: "Escavação (Mastro/Pé)", unit: "UN", price: 18500 },
        { name: "Armação (Mastro/Pé)", unit: "UN", price: 9200 },
        { name: "Concretagem (Mastro/Pé)", unit: "UN", price: 35000 },
        { name: "Nivelamento / Preparação", unit: "UN", price: 1500 },
      ],
    },
    {
      name: "MONTAGEM",
      order: 3,
      activities: [
        { name: "Pré-Montagem", unit: "KG", price: 5.5 },
        { name: "Içamento", unit: "KG", price: 7.2 },
        { name: "Revisão / Torque", unit: "KG", price: 2.0 },
      ]
    },
    {
        name: "LANÇAMENTO DE CABOS",
        order: 4,
        activities: [
            { name: "Lançamento Cabo Guia", unit: "KM", price: 1500 },
            { name: "Lançamento Condutor", unit: "KM", price: 3500 },
            { name: "Grampeação", unit: "UN", price: 800 },
            { name: "Regulação", unit: "KM", price: 1200 },
        ]
    }
  ];

  for (const c of categoryData) {
    let dbCat = await prisma.productionCategory.findFirst({
      where: { name: c.name },
    });
    if (!dbCat) {
      console.log(`Creating category: ${c.name}`);
      dbCat = await prisma.productionCategory.create({
        data: { name: c.name, order: c.order, description: `Categoria ${c.name}` },
      });
    } else {
        console.log(`Category exists: ${c.name}`);
    }

    for (const a of c.activities) {
      let dbAct = await prisma.productionActivity.findFirst({
        where: { name: a.name, categoryId: dbCat.id },
      });
      if (!dbAct) {
        console.log(`  Creating activity: ${a.name}`);
        dbAct = await prisma.productionActivity.create({
          data: { name: a.name, categoryId: dbCat.id, weight: 1.0 },
        });
      }
    }
  }

  console.log("--- SEED CONCLUÍDO COM SUCESSO! ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
