import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const GLOBAL_USERS = [
  {
    email: "juliano@gestaovirtual.com",
    name: "Juliano Freitas",
    role: "SUPER_ADMIN_GOD",
    password: "$2a$10$I5IAYCJuF3AY.Oed/DriWOottOlNGsqxi.Kpnp8w1TqzIEWnjEopi" // Senha padrão backup
  },
  {
    email: "socio@gestaovirtual.com",
    name: "Socio (Gestão Global)",
    role: "SOCIO_DIRETOR",
    password: "$2a$10$I5IAYCJuF3AY.Oed/DriWOottOlNGsqxi.Kpnp8w1TqzIEWnjEopi"
  },
  {
    email: "admin@gestaovirtual.com",
    name: "Admin (Gestão Global)",
    role: "ADMIN",
    password: "$2a$12$ElBnrtRGHWu/J1QdDbgwKu9z2ByVAm4z.6h8nVWiHHpwBRe9oTbKy"
  },
  {
    email: "ti@gestaovirtual.com",
    name: "Suporte Técnico (Gestão Global)",
    role: "TI_SOFTWARE",
    password: "$2a$10$I5IAYCJuF3AY.Oed/DriWOottOlNGsqxi.Kpnp8w1TqzIEWnjEopi"
  }
];

export async function seedGlobalUsers(prismaClient: PrismaClient = prisma) {
  console.log("🌱 Iniciando seed de usuários Gestão Global...");

  for (const userData of GLOBAL_USERS) {
    const existingAuth = await prismaClient.authCredential.findUnique({
      where: { email: userData.email }
    });

    if (existingAuth) {
      console.log(`- Usuário ${userData.email} já existe, atualizando...`);
      await prismaClient.user.update({
        where: { id: existingAuth.userId },
        data: {
          name: userData.name,
          authCredential: {
            update: {
              password: userData.password,
              role: userData.role as any,
              status: "ACTIVE"
            }
          }
        }
      });
    } else {
      console.log(`- Criando usuário ${userData.email}...`);
      await prismaClient.user.create({
        data: {
          name: userData.name,
          authCredential: {
            create: {
              email: userData.email,
              password: userData.password,
              role: userData.role as any,
              status: "ACTIVE"
            }
          }
        }
      });
    }
  }

  console.log("✅ Seed de usuários globais concluída!");
}

if (process.argv[1].endsWith("seed-global.ts")) {
  seedGlobalUsers()
    .catch((e) => {
      console.error("❌ Erro no seed-global:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
