import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function diagnose() {
  console.log("--- DIAGNÓSTICO DE DUPLICATAS ---");

  const cats = await prisma.productionCategory.findMany({
    include: { activities: true },
  });

  console.log(`Total de Categorias encontradas: ${cats.length}`);

  const seenCats = new Map();
  const duplicateCats = [];

  for (const cat of cats) {
    if (seenCats.has(cat.name)) {
      duplicateCats.push(cat);
    } else {
      seenCats.set(cat.name, cat.id);
    }

    // Verificar atividades duplicadas dentro da mesma categoria
    const seenActs = new Set();
    cat.activities.forEach((act) => {
      if (seenActs.has(act.name)) {
        console.log(
          `  [DUPLICATA] Atividade "${act.name}" na categoria "${cat.name}"`,
        );
      } else {
        seenActs.add(act.name);
      }
    });
  }

  if (duplicateCats.length > 0) {
    console.log(`\nCategorias Duplicadas encontradas: ${duplicateCats.length}`);
    duplicateCats.forEach((c) => console.log(`  - ${c.name} (ID: ${c.id})`));
  } else {
    console.log("\nNenhuma categoria duplicada (por nome) encontrada.");
  }
}

diagnose().finally(() => prisma.$disconnect());
