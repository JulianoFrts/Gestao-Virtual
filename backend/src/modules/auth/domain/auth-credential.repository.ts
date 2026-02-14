/**
 * Auth Credential Repository
 * Repositório para operações de credenciais de autenticação
 */

import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export class AuthCredentialRepository {
  /**
   * Busca credencial por email
   */
  async findByEmail(email: string) {
    return prisma.authCredential.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { user: true },
    });
  }

  /**
   * Busca credencial por login customizado
   */
  async findByLogin(login: string) {
    return prisma.authCredential.findUnique({
      where: { login: login.toLowerCase().trim() },
      include: { user: true },
    });
  }

  /**
   * Busca credencial por userId
   */
  async findByUserId(userId: string) {
    return prisma.authCredential.findUnique({
      where: { userId },
      include: { user: true },
    });
  }

  /**
   * Busca credencial por identificador (email, login ou CPF)
   */
  async findByIdentifier(identifier: string) {
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Tentar por email
    let credential = await this.findByEmail(normalizedIdentifier);
    if (credential) return credential;

    // Tentar por login
    credential = await this.findByLogin(normalizedIdentifier);
    if (credential) return credential;

    // Tentar por CPF
    const cpfClean = normalizedIdentifier.replace(/\D/g, "");
    if (cpfClean.length === 11) {
      const user = await prisma.user.findUnique({
        where: { cpf: cpfClean },
        select: { id: true },
      });
      if (user) {
        credential = await this.findByUserId(user.id);
      }
    }

    return credential;
  }

  /**
   * Cria nova credencial de autenticação
   */
  async create(data: Prisma.AuthCredentialCreateInput) {
    return prisma.authCredential.create({
      data,
      include: { user: true },
    });
  }

  /**
   * Atualiza credencial existente
   */
  async update(id: string, data: Prisma.AuthCredentialUpdateInput) {
    return prisma.authCredential.update({
      where: { id },
      data,
      include: { user: true }
    });
  }

  /**
   * Atualiza credencial por userId
   */
  async updateByUserId(userId: string, data: Prisma.AuthCredentialUpdateInput) {
    return prisma.authCredential.update({
      where: { userId },
      data,
      include: { user: true },
    } );
  }

  /**
   * Atualiza último login
   */
  async updateLastLogin(userId: string) {
    return prisma.authCredential.update({
      where: { userId },
      data: { lastLoginAt: new Date() },
    });
      }

  /**
   * Cadastra login customizado para um usuário
   */
  async setCustomLogin(userId: string, login: string) {
    // Verificar se login já existe
    const existing = await this.findByLogin(login);
    if (existing && existing.userId !== userId) {
      throw new Error("Login já está em uso");
    }

    return prisma.authCredential.update({
      where: { userId },
      data: { login: login.toLowerCase().trim() },
    });
  }

  /**
   * Habilita/desabilita MFA
   */
  async setMfaEnabled(userId: string, enabled: boolean, secret?: string) {
    return prisma.authCredential.update({
      where: { userId },
      data: {
        mfaEnabled: enabled,
        mfaSecret: enabled ? secret : null,
      },
    });
  }

  /**
   * Atualiza senha
   */
  async updatePassword(userId: string, hashedPassword: string) {
    return prisma.authCredential.update({
      where: { userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Habilita/desabilita acesso ao sistema
   */
  async setSystemUse(userId: string, enabled: boolean) {
    return prisma.authCredential.update({
      where: { userId },
      data: { systemUse: enabled },
    });
  }

  /**
   * Verifica se email já existe
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const credential = await prisma.authCredential.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { userId: true },
    });
    if (!credential) return false;
    if (excludeUserId && credential.userId === excludeUserId) return false;
    return true;
  }

  /**
   * Verifica se login já existe
   */
  async loginExists(login: string, excludeUserId?: string): Promise<boolean> {
    const credential = await prisma.authCredential.findUnique({
      where: { login: login.toLowerCase().trim() },
      select: { userId: true },
    });
    if (!credential) return false;
    if (excludeUserId && credential.userId === excludeUserId) return false;
    return true;
  }
}
