/**
 * Configuração NextAuth v5 - GESTÃO VIRTUAL
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
const permissionService = new UserPermissionService(userRepo as any);

import { CONSTANTS } from "@/lib/constants";

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: CONSTANTS.AUTH.SESSION.MAX_AGE,
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
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
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.role = user.role;
        token.status = user.status;
        token.hierarchyLevel = (user as any).hierarchyLevel;

        token.permissions = await permissionService.getPermissionsMap(
          user.role as string,
          user.id as string,
        );
        token.ui = await permissionService.getUIFlagsMap(
          user.role as string,
          (user as any).hierarchyLevel,
        );
      }

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
  logger: {
    error(code, ...message) { logger.error(`Auth Error: ${code}`, { message }); },
    warn(code, ...message) { logger.warn(`Auth Warn: ${code}`, { message }); },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// =============================================
// HELPERS
// =============================================

type CredentialsInput = Partial<Record<"identifier" | "password" | "mfaCode", unknown>>;

async function verifyCredentials(credentials: CredentialsInput) {
  try {
    const identifier = String(credentials?.identifier || "").toLowerCase().trim();
    const password = String(credentials?.password || "");
    const mfaCode = String(credentials?.mfaCode || "");

    if (!identifier || (!password && !mfaCode)) {
      logger.warn("Credenciais incompletas");
      return null;
    }

    const authCredential = await findAuthCredential(identifier);

    if (!authCredential) {
      logger.warn("Credencial não encontrada", { identifier });
      return null;
    }

    if (authCredential.status === "SUSPENDED" || authCredential.status === "INACTIVE") {
      logger.warn("Conta inativa/suspensa", { userId: authCredential.userId });
      return null;
    }

    if (!authCredential.systemUse) {
      logger.warn("Acesso sistema desabilitado", { userId: authCredential.userId });
      return null;
    }

    // Validação MFA ou Senha
    if (authCredential.mfaEnabled) {
      if (!mfaCode) {
        // Pré-validação de senha antes de pedir MFA
        if (!await bcrypt.compare(password, authCredential.password)) {
          logger.warn("Senha inválida (Pré-MFA)");
          return null;
        }
        throw new Error("MFA_REQUIRED");
      }
      if (!verifyMfaCode(authCredential.mfaSecret, mfaCode)) {
        logger.warn("Código MFA inválido");
        return null;
      }
    } else if (password) {
      if (!await bcrypt.compare(password, authCredential.password)) {
        logger.warn("Senha inválida");
        return null;
      }
    }

    await prisma.authCredential.update({
      where: { id: authCredential.id },
      data: { lastLoginAt: new Date() },
    });

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
    if (error instanceof Error && error.message === "MFA_REQUIRED") throw error;
    logger.error("Erro Auth", { error });
    return null;
  }
}

async function findAuthCredential(identifier: string) {
  const includeUser = { include: { user: { select: { name: true, image: true, cpf: true, hierarchyLevel: true } } } };

  // 1. Email
  let credential = await prisma.authCredential.findUnique({ where: { email: identifier }, ...includeUser });
  if (credential) return credential;

  // 2. Login
  credential = await prisma.authCredential.findUnique({ where: { login: identifier }, ...includeUser });
  if (credential) return credential;

  // 3. CPF
  const userByCpf = await prisma.user.findUnique({ where: { cpf: identifier.replace(/\D/g, "") }, select: { id: true } });
  if (userByCpf) {
    return await prisma.authCredential.findUnique({ where: { userId: userByCpf.id }, ...includeUser });
  }

  return null;
}

function verifyMfaCode(secret: string | null, code: string): boolean {
  if (!secret || !code) return false;
  try {
    const time = Math.floor(Date.now() / 1000 / CONSTANTS.AUTH.MFA.TIME_STEP);
    const secretBuffer = base32Decode(secret);

    for (let i = -CONSTANTS.AUTH.MFA.WINDOW; i <= CONSTANTS.AUTH.MFA.WINDOW; i++) {
      const counter = time + i;
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64BE(BigInt(counter));

      const hmac = crypto.createHmac("sha1", secretBuffer);
      hmac.update(buffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1] & 0xf;
      const otp = (((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)) % 1_000_000;

      if (otp.toString().padStart(CONSTANTS.AUTH.TOKENS.SHORT_LENGTH, "0") === code) return true;
    }
    return false;
  } catch (error) {
    logger.error("MFA Verify Error", { error });
    return false;
  }
}

function base32Decode(encoded: string): Buffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of encoded.toUpperCase()) {
    const val = chars.indexOf(char);
    if (val !== -1) bits += val.toString(2).padStart(5, "0");
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
      role: true, status: true, email: true,
      user: { select: { name: true, hierarchyLevel: true, affiliation: { select: { companyId: true, projectId: true } } } },
    },
  });

  if (authCred) {
    Object.assign(token, {
      role: authCred.role,
      status: authCred.status,
      email: authCred.email,
      name: authCred.user.name,
      hierarchyLevel: authCred.user.hierarchyLevel,
      companyId: authCred.user.affiliation?.companyId,
      projectId: authCred.user.affiliation?.projectId,
    });

    token.permissions = await permissionService.getPermissionsMap(
      authCred.role,
      token.id as string,
      authCred.user.affiliation?.projectId || undefined,
    );
    token.ui = await permissionService.getUIFlagsMap(
      authCred.role,
      authCred.user.hierarchyLevel,
    );
  }
}

function mapTokenToSession(session: any, token: any) {
  if (token && session.user) {
    const fields = ['id', 'email', 'role', 'status', 'companyId', 'projectId', 'hierarchyLevel', 'permissions', 'ui'];
    fields.forEach(f => session.user[f] = token[f]);
  }
}

export default authConfig;
