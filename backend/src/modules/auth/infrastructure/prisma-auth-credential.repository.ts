import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import {
  AuthCredential,
  CreateAuthCredentialDTO,
  UpdateAuthCredentialDTO,
} from "../domain/auth-credential.dto";
import { IAuthCredentialRepository } from "../domain/auth-credential.repository";

export class PrismaAuthCredentialRepository implements IAuthCredentialRepository {
  private client: Prisma.TransactionClient;

  constructor(prismaInstance?: Prisma.TransactionClient) {
    this.client = (prismaInstance || prisma) as Prisma.TransactionClient;
  }

  async findByEmail(email: string): Promise<AuthCredential | null> {
    return this.client.authCredential.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { user: true },
    }) as Promise<AuthCredential | null>;
  }

  async findByLogin(login: string): Promise<AuthCredential | null> {
    return this.client.authCredential.findUnique({
      where: { login: login.toLowerCase().trim() },
      include: { user: true },
    }) as Promise<AuthCredential | null>;
  }

  async findByUserId(userId: string): Promise<AuthCredential | null> {
    return this.client.authCredential.findUnique({
      where: { userId },
      include: { user: true },
    }) as Promise<AuthCredential | null>;
  }

  async findByIdentifier(identifier: string): Promise<AuthCredential | null> {
    const normalizedIdentifier = identifier.toLowerCase().trim();
    if (!normalizedIdentifier) return null;

    try {
      // 1. Busca por email
      const byEmail = await this.findByEmail(normalizedIdentifier);
      if (byEmail) return byEmail;
    } catch (err) {
      const error = err as Error;
      console.error("[AuthRepo] Erro ao buscar por email:", error.message);
      throw err;
    }

    try {
      // 2. Busca por login
      const byLogin = await this.findByLogin(normalizedIdentifier);
      if (byLogin) return byLogin;
    } catch (err) {
      const error = err as Error;
      console.error("[AuthRepo] Erro ao buscar por login:", error.message);
      throw err;
    }

    // 3. Busca por CPF (somente se parecer CPF válido)
    const cpfClean = normalizedIdentifier.replace(/\D/g, "");
    if (cpfClean.length === 11 && !/^0+$/.test(cpfClean)) {
      try {
        const user = await this.client.user.findUnique({
          where: { cpf: cpfClean },
          select: { id: true },
        });
        if (user) {
          return await this.findByUserId(user.id);
        }
      } catch (err) {
        const error = err as Error;
        console.error("[AuthRepo] Erro ao buscar por CPF:", error.message);
        throw err;
      }
    }

    return null;
  }

  async create(data: CreateAuthCredentialDTO): Promise<AuthCredential> {
    const { userId, ...rest } = data;
    return this.client.authCredential.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
      } as Prisma.AuthCredentialCreateInput,
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async update(
    id: string,
    data: UpdateAuthCredentialDTO,
  ): Promise<AuthCredential> {
    return this.client.authCredential.update({
      where: { id },
      data: data as Prisma.AuthCredentialUpdateInput,
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async updateByUserId(
    userId: string,
    data: UpdateAuthCredentialDTO,
  ): Promise<AuthCredential> {
    return this.client.authCredential.update({
      where: { userId },
      data: data as Prisma.AuthCredentialUpdateInput,
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async updateLastLogin(userId: string): Promise<AuthCredential> {
    return this.client.authCredential.update({
      where: { userId },
      data: { lastLoginAt: new Date() },
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async setCustomLogin(userId: string, login: string): Promise<AuthCredential> {
    const existing = await this.findByLogin(login);
    if (existing && existing.userId !== userId) {
      throw new Error("Login já está em uso");
    }

    return this.client.authCredential.update({
      where: { userId },
      data: { login: login.toLowerCase().trim() },
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async setMfaEnabled(
    userId: string,
    enabled: boolean,
    secret?: string,
  ): Promise<AuthCredential> {
    return this.client.authCredential.update({
      where: { userId },
      data: {
        mfaEnabled: enabled,
        mfaSecret: enabled ? secret : null,
      },
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async updatePassword(
    userId: string,
    hashedPassword: string,
  ): Promise<AuthCredential> {
    return this.client.authCredential.update({
      where: { userId },
      data: { password: hashedPassword },
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async setSystemUse(
    userId: string,
    enabled: boolean,
  ): Promise<AuthCredential> {
    return this.client.authCredential.update({
      where: { userId },
      data: { systemUse: enabled },
      include: { user: true },
    }) as Promise<AuthCredential>;
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const credential = await this.client.authCredential.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { userId: true },
    });
    if (!credential) return false;
    if (excludeUserId && credential.userId === excludeUserId) return false;
    return true;
  }

  async loginExists(login: string, excludeUserId?: string): Promise<boolean> {
    const credential = await this.client.authCredential.findUnique({
      where: { login: login.toLowerCase().trim() },
      select: { userId: true },
    });
    if (!credential) return false;
    if (excludeUserId && credential.userId === excludeUserId) return false;
    return true;
  }
}
