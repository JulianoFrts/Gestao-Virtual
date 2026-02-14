/**
 * Configuração NextAuth v5 - Orion System Backend
 * Sistema de Autenticação Multi-Modal (Email, Login, MFA)
 */

import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { UserPermissionService } from "@/modules/users/application/user-permission.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";

const userRepo = new PrismaUserRepository();
const permissionService = new UserPermissionService(userRepo);

export const authConfig: NextAuthConfig = {
  // Estratégia de sessão JWT via Auth.js
  session: {
    strategy: "jwt",
    maxAge: 20 * 60 * 60, // 20 horas (conforme solicitado pelo usuário)
  },

  // Configuração de páginas customizadas
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },

  // Provedores
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credenciais",
      credentials: {
        identifier: { label: "Email/Login/CPF", type: "text" },
        password: { label: "Senha", type: "password" },
        mfaCode: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials) {
        return await verifyCredentials(credentials);
      },
    }),
  ],

  // Callbacks
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.role = user.role;
        token.status = user.status;
        token.hierarchyLevel = (user as any).hierarchyLevel;

        // Inicializar permissões no login
        const perms = await permissionService.getPermissionsMap(
          user.role as string,
          user.id as string,
        );
        const ui = await permissionService.getUIFlagsMap(
          user.role as string,
          (user as any).hierarchyLevel,
        );
        token.permissions = perms;
        token.ui = ui;
      }
      // Atualização de sessão
      if (trigger === "update" && token.id) {
        await refreshUserToken(token);
      }
      return token;
    },
    async session({ session, token }) {
      mapTokenToSession(session, token);
      return session;
    },
  },

  // Logging via Auth.js logger
  logger: {
    error(code, ...message) {
      logger.error(`Auth Error: ${code}`, { message });
    },
    warn(code, ...message) {
      logger.warn(`Auth Warn: ${code}`, { message });
    },
  },

  // Secret
  secret: process.env.NEXTAUTH_SECRET,
};

// =============================================
// HELPERS - Verificação Multi-Modal
// =============================================

type CredentialsInput = Partial<
  Record<"identifier" | "password" | "mfaCode", unknown>
>;

async function verifyCredentials(credentials: CredentialsInput) {
  try {
    const identifier = String(credentials?.identifier || "")
      .toLowerCase()
      .trim();
    const password = String(credentials?.password || "");
    const mfaCode = String(credentials?.mfaCode || "");

    if (!identifier || (!password && !mfaCode)) {
      logger.warn("Credenciais incompletas");
      return null;
    }

    // Buscar credencial por email, login ou CPF (via user)
    const authCredential = await findAuthCredential(identifier);

    if (!authCredential) {
      logger.warn("Credencial não encontrada", { identifier });
      return null;
    }

    // Verificar status
    if (
      authCredential.status === "SUSPENDED" ||
      authCredential.status === "INACTIVE"
    ) {
      logger.warn("Conta inativa ou suspensa", {
        userId: authCredential.userId,
      });
      return null;
    }

    // Verificar se systemUse está ativo
    if (!authCredential.systemUse) {
      logger.warn("Acesso ao sistema desabilitado", {
        userId: authCredential.userId,
      });
      return null;
    }

    // Se MFA está habilitado e não foi fornecido código, verificar apenas senha
    if (authCredential.mfaEnabled) {
      if (!mfaCode) {
        // Primeira etapa: verificar senha e solicitar MFA
        const isValidPassword = await bcrypt.compare(
          password,
          authCredential.password,
        );
        if (!isValidPassword) {
          logger.warn("Senha inválida (MFA pendente)");
          return null;
        }
        // Retornar indicador de que MFA é necessário
        // NextAuth não suporta bem isso, então vamos usar uma flag
        throw new Error("MFA_REQUIRED");
      }

      // Verificar código MFA
      if (!verifyMfaCode(authCredential.mfaSecret, mfaCode)) {
        logger.warn("Código MFA inválido");
        return null;
      }
    }

    // Verificar senha (caso não tenha MFA ou MFA válido)
    if (!authCredential.mfaEnabled && password) {
      const isValidPassword = await bcrypt.compare(
        password,
        authCredential.password,
      );
      if (!isValidPassword) {
        logger.warn("Senha inválida");
        return null;
      }
    }

    // Atualizar último login
    await prisma.authCredential.update({
      where: { id: authCredential.id },
      data: { lastLoginAt: new Date() },
    });

    // Retornar objeto usuário (v5 compatível)
    return {
      id: authCredential.userId,
      email: authCredential.email,
      name: authCredential.user.name,
      role: authCredential.role,
      status: authCredential.status,
      image: authCredential.user.image,
      hierarchyLevel: authCredential.user.hierarchyLevel,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "MFA_REQUIRED") {
      throw error; // Re-throw para tratamento especial
    }
    logger.error("Erro Auth", { error });
    return null;
  }
}

/**
 * Busca credencial de autenticação por email, login ou CPF
 */
async function findAuthCredential(identifier: string) {
  // Tentar por email
  let credential = await prisma.authCredential.findUnique({
    where: { email: identifier },
    include: {
      user: {
        select: { name: true, image: true, cpf: true, hierarchyLevel: true },
      },
    },
  });

  if (credential) return credential;

  // Tentar por login customizado
  credential = await prisma.authCredential.findUnique({
    where: { login: identifier },
    include: {
      user: {
        select: { name: true, image: true, cpf: true, hierarchyLevel: true },
      },
    },
  });

  if (credential) return credential;

  // Tentar por CPF (buscar user primeiro)
  const userByCpf = await prisma.user.findUnique({
    where: { cpf: identifier.replace(/\D/g, "") },
    select: { id: true },
  });

  if (userByCpf) {
    credential = await prisma.authCredential.findUnique({
      where: { userId: userByCpf.id },
      include: {
        user: {
          select: { name: true, image: true, cpf: true, hierarchyLevel: true },
        },
      },
    });
  }

  return credential;
}

/**
 * Verifica código TOTP (2FA)
 */
function verifyMfaCode(secret: string | null, code: string): boolean {
  if (!secret || !code) return false;

  try {
    const time = Math.floor(Date.now() / 1000 / 30);

    for (let i = -1; i <= 1; i++) {
      const counter = time + i;
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64BE(BigInt(counter));

      // Decodificar base32 manualmente
      const secretBuffer = base32Decode(secret);

      // Usar crypto nativo do Node
      const hmac = crypto.createHmac("sha1", secretBuffer);
      hmac.update(buffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1] & 0xf;
      const otp =
        (((hash[offset] & 0x7f) << 24) |
          ((hash[offset + 1] & 0xff) << 16) |
          ((hash[offset + 2] & 0xff) << 8) |
          (hash[offset + 3] & 0xff)) %
        1000000;

      if (otp.toString().padStart(6, "0") === code) {
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error("Erro ao verificar MFA", { error });
    return false;
  }
}

/**
 * Decodifica string Base32 para Buffer
 */
function base32Decode(encoded: string): Buffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";

  for (const char of encoded.toUpperCase()) {
    const val = chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

async function refreshUserToken(token: Record<string, unknown>) {
  const authCred = await prisma.authCredential.findUnique({
    where: { userId: token.id as string },
    select: {
      role: true,
      status: true,
      email: true,
      user: {
        select: {
          name: true,
          hierarchyLevel: true,
          affiliation: {
            select: {
              companyId: true,
              projectId: true,
            },
          },
        },
      },
    },
  });
  if (authCred) {
    token.role = authCred.role;
    token.status = authCred.status;
    token.email = authCred.email;
    token.name = authCred.user.name;
    token.hierarchyLevel = authCred.user.hierarchyLevel;
    token.companyId = authCred.user.affiliation?.companyId;
    token.projectId = authCred.user.affiliation?.projectId;

    // Atualizar permissões e UI
    const perms = await permissionService.getPermissionsMap(
      authCred.role,
      token.id as string,
      authCred.user.affiliation?.projectId || undefined,
    );
    const ui = await permissionService.getUIFlagsMap(
      authCred.role,
      authCred.user.hierarchyLevel,
    );
    token.permissions = perms;
    token.ui = ui;
  }
}

function mapTokenToSession(session: any, token: any) {
  if (token && session.user) {
    session.user.id = token.id;
    session.user.email = token.email;
    session.user.role = token.role;
    session.user.status = token.status;
    session.user.companyId = token.companyId;
    session.user.projectId = token.projectId;
    session.user.hierarchyLevel = token.hierarchyLevel;
    session.user.permissions = token.permissions;
    session.user.ui = token.ui;
  }
}

export default authConfig;
