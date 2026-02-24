/**
 * Script: Encontrar duplicatas no banco de dados
 *
 * Verifica duplicatas de registrationNumber, CPF e Email.
 *
 * Uso: cd backend && npx tsx scripts/find-duplicates.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findDuplicates() {
  console.log("=".repeat(60));
  console.log("  VERIFICAÇÃO DE DUPLICATAS - GESTÃO VIRTUAL");
  console.log("=".repeat(60));

  // 1. Matrículas duplicadas
  console.log("\n📋 MATRÍCULAS DUPLICADAS:");
  const regDups = await prisma.$queryRaw<
    { registration_number: string; count: bigint }[]
  >`
    SELECT registration_number, COUNT(*) as count FROM users
    WHERE registration_number IS NOT NULL AND registration_number != ''
    GROUP BY registration_number HAVING COUNT(*) > 1 ORDER BY count DESC
  `;
  console.log(
    regDups.length === 0
      ? "  ✅ Nenhuma"
      : `  ⚠️ ${regDups.length} encontradas`,
  );
  for (const d of regDups)
    console.log(`    ${d.registration_number} (${d.count}x)`);

  // 2. CPFs duplicados
  console.log("\n🪪 CPFs DUPLICADOS:");
  const cpfDups = await prisma.$queryRaw<{ cpf: string; count: bigint }[]>`
    SELECT cpf, COUNT(*) as count FROM users
    WHERE cpf IS NOT NULL AND cpf != ''
    GROUP BY cpf HAVING COUNT(*) > 1 ORDER BY count DESC
  `;
  console.log(
    cpfDups.length === 0 ? "  ✅ Nenhum" : `  ⚠️ ${cpfDups.length} encontrados`,
  );
  for (const d of cpfDups) console.log(`    ${d.cpf} (${d.count}x)`);

  // 3. Emails duplicados
  console.log("\n📧 EMAILS DUPLICADOS:");
  const emailDups = await prisma.$queryRaw<{ email: string; count: bigint }[]>`
    SELECT email, COUNT(*) as count FROM auth_credentials
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email HAVING COUNT(*) > 1 ORDER BY count DESC
  `;
  console.log(
    emailDups.length === 0
      ? "  ✅ Nenhum"
      : `  ⚠️ ${emailDups.length} encontrados`,
  );

  console.log("\n" + "=".repeat(60));
  await prisma.$disconnect();
}

findDuplicates().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
