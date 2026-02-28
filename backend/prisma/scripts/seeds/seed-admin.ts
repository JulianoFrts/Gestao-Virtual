import { PrismaClient } from "@prisma/client";
import { PASSWORD_HASHES } from "../src/lib/constants/business";
import "dotenv/config";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

export async function seedAdmin(prismaClient: PrismaClient = prisma) {
  const email = "admin@orion.com";
  const name = "Administrador";

  // Use pre-defined hash to avoid bcrypt dependency in seed and ensure consistency
  const hashedPassword = PASSWORD_HASHES.DEFAULT_SEED;


  // Strategy: Find AuthCredential by email. If exists, update User & AuthCredential. If not, Create User & AuthCredential.

  const existingAuth = await prismaClient.authCredential.findUnique({
    where: { email },
    include: { user: true }
  });

  let userId = existingAuth?.userId;

  if (existingAuth) {
    console.log("Admin exists, updating...");
    await prismaClient.user.update({
      where: { id: userId },
      data: {
        name,
        authCredential: {
          update: {
            password: hashedPassword,
            role: "ADMIN"
          }
        }
      }
    });
  } else {
    console.log("Creating Admin...");
    await prismaClient.user.create({
      data: {
        name,
        authCredential: {
          create: {
            email,
            password: hashedPassword,
            role: "ADMIN",
            status: "ACTIVE"
          }
        }
      }
    });
  }

  console.log("✅ Admin criado/atualizado!");
  console.log("   Email:", email);
  console.log("   Senha: (Padrão Seed)");
}

// Self-run only if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedAdmin()
    .catch((e) => {
      console.error("❌ Erro:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
