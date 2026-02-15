/**
 * Script de Migração: Users → AuthCredentials
 *
 * Este script migra os dados de autenticação da tabela `users` antiga
 * para a nova tabela `auth_credentials`.
 *
 * Executar com: npx tsx src/scripts/migrate-auth-credentials.ts
 */

import "dotenv/config";
import { prisma } from "../lib/prisma/client";

interface LegacyUser {
  id: string;
  email: string | null;
  password: string | null;
  role: string;
  status: string | null;
  mfaEnabled: boolean | null;
  mfaSecret: string | null;
  lastLoginAt: Date | null;
  emailVerified: Date | null;
  registrationNumber: string | null;
}

async function migrateAuthCredentials() {
  console.log("🚀 Iniciando migração de credenciais...\n");

  try {
    // 1. Buscar todos os usuários que ainda não têm credenciais migradas
    const usersWithoutCredentials = await prisma.$queryRaw<LegacyUser[]>`
            SELECT u.id, u.email, u.password, u.role, u.status, 
                   u."mfaEnabled", u."mfaSecret", u."lastLoginAt", 
                   u."emailVerified", u."registrationNumber"
            FROM users u
            LEFT JOIN auth_credentials ac ON ac.user_id = u.id
            WHERE ac.id IS NULL 
              AND u.email IS NOT NULL 
              AND u.password IS NOT NULL
        `;

    console.log(
      `📋 Encontrados ${usersWithoutCredentials.length} usuários para migrar\n`,
    );

    if (usersWithoutCredentials.length === 0) {
      console.log(
        "✅ Nenhum usuário para migrar. Todos já possuem credenciais.\n",
      );
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of usersWithoutCredentials) {
      try {
        // Verificar se email já existe em auth_credentials
        const existingByEmail = await prisma.authCredential.findFirst({
          where: { email: user.email!.toLowerCase() },
        });

        if (existingByEmail) {
          console.log(
            `⏭️  Pulando ${user.email} - email já existe em auth_credentials`,
          );
          skipped++;
          continue;
        }

        // Criar nova credencial
        await prisma.authCredential.create({
          data: {
            userId: user.id,
            email: user.email!.toLowerCase(),
            password: user.password!,
            role: mapRole(user.role),
            status: mapStatus(user.status),
            mfaEnabled: user.mfaEnabled || false,
            mfaSecret: user.mfaSecret,
            lastLoginAt: user.lastLoginAt,
            emailVerified: user.emailVerified,
            // Login customizado: usar matrícula se existir
            login: user.registrationNumber
              ? user.registrationNumber.toLowerCase()
              : null,
            systemUse: true,
          },
        });

        console.log(`✅ Migrado: ${user.email}`);
        migrated++;
      } catch (err) {
        console.error(`❌ Erro ao migrar ${user.email}:`, err);
        errors++;
      }
    }

    console.log("\n--- Resumo da Migração ---");
    console.log(`✅ Migrados: ${migrated}`);
    console.log(`⏭️  Pulados: ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${usersWithoutCredentials.length}`);
  } catch (error) {
    console.error("❌ Erro fatal na migração:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Mapeia roles antigas para o enum atual do Prisma
 */
function mapRole(role: string | null): any {
  const roleMap: Record<string, string> = {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    SUPERVISOR: "SUPERVISOR",
    COORDINATOR: "SUPERVISOR", // Mapping to existing role
    LEAD: "USER",             // Mapping to existing role
    USER: "USER",
    WORKER: "WORKER",
    VIEWER: "VIEWER",
    GUEST: "GUEST",
    TECHNICIAN: "TECHNICIAN",
    OPERATOR: "OPERATOR",
  };

  return (roleMap[(role || "USER").toUpperCase()] || "USER") as any;
}

/**
 * Mapeia status antigo para o enum atual
 */
function mapStatus(
  status: string | null,
): "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "INACTIVE" {
  const statusMap: Record<
    string,
    "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "INACTIVE"
  > = {
    ACTIVE: "ACTIVE",
    PENDING_VERIFICATION: "PENDING_VERIFICATION",
    PENDING: "PENDING_VERIFICATION",
    SUSPENDED: "SUSPENDED",
    BLOCKED: "SUSPENDED",
    INACTIVE: "INACTIVE",
  };

  return statusMap[(status || "ACTIVE").toUpperCase()] || "ACTIVE";
}

// Executar migração
migrateAuthCredentials()
  .then(() => {
    console.log("\n🎉 Migração concluída com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migração falhou:", error);
    process.exit(1);
  });
