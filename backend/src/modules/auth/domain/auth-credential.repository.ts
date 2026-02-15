import { Prisma } from "@prisma/client";

export interface IAuthCredentialRepository {
  findByEmail(email: string): Promise<any | null>;
  findByLogin(login: string): Promise<any | null>;
  findByUserId(userId: string): Promise<any | null>;
  findByIdentifier(identifier: string): Promise<any | null>;
  create(data: Prisma.AuthCredentialCreateInput): Promise<any>;
  update(id: string, data: Prisma.AuthCredentialUpdateInput): Promise<any>;
  updateByUserId(userId: string, data: Prisma.AuthCredentialUpdateInput): Promise<any>;
  updateLastLogin(userId: string): Promise<any>;
  setCustomLogin(userId: string, login: string): Promise<any>;
  setMfaEnabled(userId: string, enabled: boolean, secret?: string): Promise<any>;
  updatePassword(userId: string, hashedPassword: string): Promise<any>;
  setSystemUse(userId: string, enabled: boolean): Promise<any>;
  emailExists(email: string, excludeUserId?: string): Promise<boolean>;
  loginExists(login: string, excludeUserId?: string): Promise<boolean>;
}
