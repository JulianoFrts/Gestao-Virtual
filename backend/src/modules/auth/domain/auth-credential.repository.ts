import {
  AuthCredential,
  CreateAuthCredentialDTO,
  UpdateAuthCredentialDTO,
} from "./auth-credential.dto";

export interface IAuthCredentialRepository {
  findByEmail(email: string): Promise<AuthCredential | null>;
  findByLogin(login: string): Promise<AuthCredential | null>;
  findByUserId(userId: string): Promise<AuthCredential | null>;
  findByIdentifier(identifier: string): Promise<AuthCredential | null>;
  create(data: CreateAuthCredentialDTO): Promise<AuthCredential>;
  update(id: string, data: UpdateAuthCredentialDTO): Promise<AuthCredential>;
  updateByUserId(
    userId: string,
    data: UpdateAuthCredentialDTO,
  ): Promise<AuthCredential>;
  updateLastLogin(userId: string): Promise<AuthCredential>;
  setCustomLogin(userId: string, login: string): Promise<AuthCredential>;
  setMfaEnabled(
    userId: string,
    enabled: boolean,
    secret?: string,
  ): Promise<AuthCredential>;
  updatePassword(
    userId: string,
    hashedPassword: string,
  ): Promise<AuthCredential>;
  setSystemUse(userId: string, enabled: boolean): Promise<AuthCredential>;
  emailExists(email: string, excludeUserId?: string): Promise<boolean>;
  loginExists(login: string, excludeUserId?: string): Promise<boolean>;
}
