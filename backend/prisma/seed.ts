import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { seedGlobalUsers } from "./seed-global";
import { seedAdmin } from "./seed-admin";
import { seedInfrastructure } from "./seed-infrastructure";
import { seedProduction } from "./seed-production";
import { seedPersonnel } from "./master-seed-personnel";

dotenv.config();

const prisma = new PrismaClient();

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║              UNIFIED SEED CHAIN (v2)                    ║
 * ║                                                         ║
 * ║  Ordem de execução:                                     ║
 * ║  0. Usuários Globais (Super Admin, Sócio, TI)           ║
 * ║  1. Admin Orion (admin@orion.com)                       ║
 * ║  2. Infraestrutura (Empresa → Obra → Canteiros → Funções)║
 * ║  3. Produção (Categorias e Atividades)                  ║
 * ║  4. Pessoal (Funcionários → Equipes → Vínculos)         ║
 * ╚══════════════════════════════════════════════════════════╝
 */
async function main() {
  console.log("🌱 STARTING UNIFIED SEEDING v2 🌱");
  console.log("===================================");

  // 0. Usuários Globais (Super Admin God, Sócio, Admin, TI)
  console.log("\n📌 STEP 0: Usuários Globais");
  await seedGlobalUsers(prisma);

  // 1. Admin Orion
  console.log("\n📌 STEP 1: Admin Orion");
  await seedAdmin(prisma);

  // 2. Infraestrutura: Empresa → Obra → Canteiros → Funções → Vínculos Admin
  console.log("\n📌 STEP 2: Infraestrutura");
  await seedInfrastructure(prisma);

  // 3. Configuração de Produção (Categorias e Atividades)
  console.log("\n📌 STEP 3: Configuração de Produção");
  await seedProduction(prisma);

  // 4. Pessoal: Funcionários → Funções → Equipes → Vínculos
  console.log("\n📌 STEP 4: Pessoal e Equipes");
  await seedPersonnel(prisma);

  console.log("\n===================================");
  console.log("✅ UNIFIED SEEDING v2 COMPLETE ✅");
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
