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
import { PrismaPermissionRepository } from "@/modules/users/infrastructure/prisma-permission.repository";
import { CONSTANTS } from "@/lib/constants";

const permissionRepository = new PrismaPermissionRepository();
const permissionService = new UserPermissionService(permissionRepository);

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
      async authorize(credentials): Promise<any | null> {
        return await verifyCredentials(credentials as CredentialsInput);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }): Promise<any> {
      // 1. Inicialização (Login)
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.role = user.role;
        token.status = user.status;
        token.hierarchyLevel = user.hierarchyLevel;
        token.companyId = user.companyId;
        token.projectId = user.projectId;
        token.siteId = user.siteId;
      }

      // 2. Re-hidratação / Update
      if (token.id && (!token.permissions || trigger === "update")) {
        // Se houve update manual de contexto
        if (trigger === "update" && (session as any)?.user) {
          const s = session as any;
          if (s.user.companyId) token.companyId = s.user.companyId;
          if (s.user.projectId) token.projectId = s.user.projectId;
          if (s.user.siteId) token.siteId = s.user.siteId;
        }

        // Carregar dados atualizados do banco para garantir consistência
        await refreshUserToken(token);
      }

      return token;
    },
    async session({ session, token }): Promise<any> {
      mapTokenToSession(session, token);
      return session;
    },
  },
  logger: {
    error(code, ...message) {
      logger.error(`Auth Error: ${code}`, { message });
    },
    warn(code, ...message) {
      logger.warn(`Auth Warn: ${code}`, { message });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// =============================================
// HELPERS
// =============================================

type CredentialsInput = Partial<
  Record<"identifier" | "password" | "mfaCode", string>
>;

async function verifyCredentials(credentials: CredentialsInput): Promise<any | null> {
  try {
    const identifier = (credentials?.identifier || "").toLowerCase().trim();
    const password = credentials?.password || "";
    const mfaCode = credentials?.mfaCode || "";

    if (!identifier || (!password && !mfaCode)) {
      logger.warn("Credenciais incompletas");
      return null;
    }

    const authCredential = await findAuthCredential(identifier);
    if (!authCredential) {
      logger.warn("Credencial não encontrada", { identifier });
      return null;
    }

    validateAccountStatus(authCredential);

    if (authCredential.mfaEnabled) {
      await validateMfaFlow(authCredential, password, mfaCode);
    } else if (password) {
      if (!(await bcrypt.compare(password, authCredential.password))) {
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
      hierarchyLevel: authCredential.user.affiliation?.hierarchyLevel || 0,
      companyId: authCredential.user.affiliation?.companyId,
      projectId: authCredential.user.affiliation?.projectId,
      siteId: authCredential.user.affiliation?.siteId,
    };
  } catch (error: any) {
    if (error?.message === "MFA_REQUIRED") throw error;
    logger.error("Erro Auth", { error });
    return null;
  }
}

function validateAccountStatus(authCredential: any): void {
  if (["SUSPENDED", "INACTIVE"].includes(authCredential.status)) {
    logger.warn("Conta inativa/suspensa", { userId: authCredential.userId });
    throw new Error("ACCOUNT_INACTIVE");
  }

  if (!authCredential.systemUse) {
    logger.warn("Acesso sistema desabilitado", { userId: authCredential.userId });
    throw new Error("SYSTEM_ACCESS_DISABLED");
  }
}

async function validateMfaFlow(authCredential: any, password: string, mfaCode: string): Promise<void> {
  if (!mfaCode) {
    if (!(await bcrypt.compare(password, authCredential.password))) {
      logger.warn("Senha inválida (Pré-MFA)");
      throw new Error("INVALID_CREDENTIALS");
    }
    throw new Error("MFA_REQUIRED");
  }
  
  if (!verifyMfaCode(authCredential.mfaSecret, mfaCode)) {
    logger.warn("Código MFA inválido");
    throw new Error("INVALID_MFA_CODE");
  }
}

async function findAuthCredential(identifier: string): Promise<any | null> {
  const includeUser = {
    include: {
      user: {
        select: {
          name: true,
          image: true,
          cpf: true,
          affiliation: {
            select: {
              hierarchyLevel: true,
              companyId: true,
              projectId: true,
              siteId: true,
            },
          },
        },
      },
    },
  };

  const credential = await prisma.authCredential.findFirst({
    where: {
      OR: [
        { email: identifier },
        { login: identifier }
      ]
    },
    ...includeUser,
  });

  if (credential) return credential;

  const userByCpf = await prisma.user.findUnique({
    where: { cpf: identifier.replace(/\D/g, "") },
    select: { id: true },
  });

  if (userByCpf) {
    return await prisma.authCredential.findUnique({
      where: { userId: userByCpf.id },
      ...includeUser,
    });
  }

  return null;
}

const OTP_MODULUS = 1_000_000;

function verifyMfaCode(secret: string | null, code: string): boolean {
  if (!secret || !code) return false;
  try {
    const time = Math.floor(
      Date.now() / CONSTANTS.TIME.MS_IN_SECOND / CONSTANTS.AUTH.MFA.TIME_STEP,
    );
    const secretBuffer = base32Decode(secret);

    for (let i = -CONSTANTS.AUTH.MFA.WINDOW; i <= CONSTANTS.AUTH.MFA.WINDOW; i++) {
      const counter = time + i;
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64BE(BigInt(counter));

      const hmac = crypto.createHmac("sha1", secretBuffer);
      hmac.update(buffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1] & 0xf;
      const otp =
        (((hash[offset] & 0x7f) << 24) |
          ((hash[offset + 1] & 0xff) << 16) |
          ((hash[offset + 2] & 0xff) << 8) |
          (hash[offset + 3] & 0xff)) %
        OTP_MODULUS;

      if (otp.toString().padStart(CONSTANTS.AUTH.TOKENS.SHORT_LENGTH, "0") === code)
        return true;
    }
    return false;
  } catch (error) {
    logger.error("MFA Verify Error", { error });
    return false;
  }
}

function base32Decode(encoded: string): Buffer {
  const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const BITS_PER_CHAR = 5;
  const BITS_PER_BYTE = 8;
  
  let bits = "";
  for (const char of encoded.toUpperCase()) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx !== -1) bits += idx.toString(2).padStart(BITS_PER_CHAR, "0");
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + BITS_PER_BYTE <= bits.length; i += BITS_PER_BYTE) {
    bytes.push(parseInt(bits.substring(i, i + BITS_PER_BYTE), 2));
  }
  return Buffer.from(bytes);
}

async function refreshUserToken(token: any): Promise<void> {
  const authCred = await prisma.authCredential.findUnique({
    where: { userId: token.id as string },
    select: {
      role: true,
      status: true,
      email: true,
      user: {
        select: {
          name: true,
          affiliation: {
            select: {
              hierarchyLevel: true,
              companyId: true,
              projectId: true,
              siteId: true,
            },
          },
        },
      },
    },
  });

  if (authCred) {
    const aff = authCred.user.affiliation;
    Object.assign(token, {
      role: authCred.role,
      status: authCred.status,
      email: authCred.email,
      name: authCred.user.name,
      hierarchyLevel: aff?.hierarchyLevel || 0,
      companyId: token.companyId || aff?.companyId,
      projectId: token.projectId || aff?.projectId,
      siteId: token.siteId || aff?.siteId,
    });

    token.permissions = await permissionService.getPermissionsMap(
      authCred.role,
      token.id as string,
      (token.projectId as string) || aff?.projectId || undefined,
    );
    token.ui = await permissionService.getUIFlagsMap(
      authCred.role,
      aff?.hierarchyLevel || 0,
    );
  }
}

function mapTokenToSession(session: any, token: any): void {
  if (token && session.user) {
    const fields = [
      "id", "email", "role", "status", "companyId", 
      "projectId", "siteId", "hierarchyLevel", "permissions", "ui"
    ];
    fields.forEach((f) => {
      if (token[f] !== undefined) session.user[f] = token[f];
    });
  }
}

export default authConfig;
