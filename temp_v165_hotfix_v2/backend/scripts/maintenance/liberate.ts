import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Liberando acesso total para usuários...");

  // 1. Encontrar todos os usuários
  const users = await prisma.user.findMany({
      include: { authCredential: true }
  });

  for (const user of users) {
    const email = user.authCredential?.email || "Email nÃ£o encontrado";
    console.log(`- Processando: ${email}`);

    // Update AuthCredential
    if (user.authCredential) {
        await prisma.authCredential.update({
            where: { id: user.authCredential.id },
            data: { 
                role: "SUPER_ADMIN_GOD", 
                status: "ACTIVE" 
            }
        });
    } else {
        console.warn(`User ${user.id} sem credenciais.`);
    }
  }

  console.log("✅ Acesso liberado para todos os usuários existentes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
