/**
 * Auth Service - Sistema de Autenticação Multi-Modal
 * Suporta login por Email, Login customizado, CPF e 2FA
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthCredentialRepository } from "../domain/auth-credential.repository";
import { UserService } from "../../users/application/user.service";

const SALT_ROUNDS = 12;
const TOTP_WINDOW = 30; // segundos

export class AuthService {
  private readonly authRepo: AuthCredentialRepository;

  constructor(private readonly userService: UserService) {
    this.authRepo = new AuthCredentialRepository();
  }

  // =============================================
  // REGISTRO
  // =============================================

  /**
   * Registra um novo usuário com credenciais
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    companyId?: string | null;
    projectId?: string | null;
    siteId?: string | null;
    registrationNumber?: string | null;
    [key: string]: any; // Allow extra fields like CPF, Address, etc.
  }) {
    // Validar senha mínima de 6 caracteres (O Zod já faz, mas mantemos como redundância)
    if (!data.password || data.password.length < 6) {
      throw new Error("Senha deve ter no mínimo 6 caracteres");
    }

    // Verificar se email já existe
    if (await this.authRepo.emailExists(data.email)) {
      throw new Error("Email já está em uso");
    }

    // Criar usuário completo via UserService (que já lida com AuthCredential e Affiliation)
    // O UserService.createUser já faz o hash da senha
    const newUser = await this.userService.createUser({
      ...data,
      role: data.role || "USER",
    });

    return newUser;
  }

  // =============================================
  // AUTENTICAÇÃO
  // =============================================

  /**
   * Autentica usuário por qualquer identificador
   */
  async authenticate(identifier: string, password: string, mfaCode?: string) {
    const credential = await this.authRepo.findByIdentifier(identifier);

    if (!credential) {
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    // Verificar status
    if (credential.status === "SUSPENDED" || credential.status === "INACTIVE") {
      return { success: false, error: "ACCOUNT_DISABLED" };
    }

    if (!credential.systemUse) {
      return { success: false, error: "SYSTEM_ACCESS_DISABLED" };
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, credential.password);
    if (!isValidPassword) {
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    // Verificar MFA se habilitado
    if (credential.mfaEnabled) {
      if (!mfaCode) {
        return { success: false, error: "MFA_REQUIRED", requiresMfa: true };
      }

      if (!this.verifyTotpCode(credential.mfaSecret, mfaCode)) {
        return { success: false, error: "INVALID_MFA_CODE" };
      }
    }

    // Atualizar último login
    await this.authRepo.updateLastLogin(credential.userId);

    return {
      success: true,
      user: {
        id: credential.userId,
        email: credential.email,
        name: credential.user.name,
        role: credential.role,
        status: credential.status,
      },
    };
  }

  /**
   * Verifica apenas se usuário tem MFA habilitado
   */
  async checkMfaStatus(identifier: string): Promise<{
    hasMfa: boolean;
    hasLogin: boolean;
    found: boolean;
  }> {
    const credential = await this.authRepo.findByIdentifier(identifier);

    if (!credential) {
      return { found: false, hasMfa: false, hasLogin: false };
    }

    return {
      found: true,
      hasMfa: credential.mfaEnabled,
      hasLogin: !!credential.login,
    };
  }

  // =============================================
  // RECUPERAÇÃO DE SENHA
  // =============================================

  /**
   * Recupera senha usando 2FA (obrigatório)
   */
  async recoverPasswordWith2FA(
    email: string,
    mfaCode: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Validar nova senha
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Senha deve ter no mínimo 6 caracteres" };
    }

    const credential = await this.authRepo.findByEmail(email);

    if (!credential) {
      return { success: false, error: "Email não encontrado" };
    }

    // MFA é obrigatório para recuperação
    if (!credential.mfaEnabled || !credential.mfaSecret) {
      return {
        success: false,
        error: "MFA não está habilitado para esta conta",
      };
    }

    // Verificar código MFA
    if (!this.verifyTotpCode(credential.mfaSecret, mfaCode)) {
      return { success: false, error: "Código 2FA inválido" };
    }

    // Atualizar senha
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.authRepo.updatePassword(credential.userId, hashedPassword);

    return { success: true };
  }

  // =============================================
  // CONFIGURAÇÃO DE LOGIN CUSTOMIZADO
  // =============================================

  /**
   * Cadastra login customizado para um usuário
   */
  async setCustomLogin(
    userId: string,
    login: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!login || login.length < 3) {
      return { success: false, error: "Login deve ter no mínimo 3 caracteres" };
    }

    // Verificar se login já existe
    if (await this.authRepo.loginExists(login, userId)) {
      return { success: false, error: "Login já está em uso" };
    }

    await this.authRepo.setCustomLogin(userId, login);
    return { success: true };
  }

  // =============================================
  // CONFIGURAÇÃO DE MFA
  // =============================================

  /**
   * Gera secret para MFA
   */
  generateMfaSecret(): { secret: string; otpAuthUrl: string } {
    const secret = this.generateBase32Secret();
    const otpAuthUrl = `otpauth://totp/OrioN?secret=${secret}&issuer=OrioN`;

    return { secret, otpAuthUrl };
  }

  /**
   * Habilita MFA para um usuário
   */
  async enableMfa(
    userId: string,
    secret: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Verificar código antes de habilitar
    if (!this.verifyTotpCode(secret, code)) {
      return { success: false, error: "Código inválido" };
    }

    await this.authRepo.setMfaEnabled(userId, true, secret);
    return { success: true };
  }

  /**
   * Desabilita MFA para um usuário
   */
  async disableMfa(
    userId: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    const credential = await this.authRepo.findByUserId(userId);

    if (!credential) {
      return { success: false, error: "Usuário não encontrado" };
    }

    // Verificar senha antes de desabilitar
    const isValidPassword = await bcrypt.compare(password, credential.password);
    if (!isValidPassword) {
      return { success: false, error: "Senha inválida" };
    }

    await this.authRepo.setMfaEnabled(userId, false);
    return { success: true };
  }

  // =============================================
  // HELPERS
  // =============================================

  /**
   * Verifica código TOTP
   */
  private verifyTotpCode(secret: string | null, code: string): boolean {
    if (!secret || !code) return false;

    try {
      const time = Math.floor(Date.now() / 1000 / TOTP_WINDOW);

      // Verificar código atual e adjacentes (tolerância de ±1 janela)
      for (let i = -1; i <= 1; i++) {
        const counter = time + i;
        const generatedCode = this.generateTotpCode(secret, counter);
        if (generatedCode === code.padStart(6, "0")) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Gera código TOTP para um contador específico
   */
  private generateTotpCode(secret: string, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    // Decodificar secret base32
    const secretBuffer = this.base32Decode(secret);
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

    return otp.toString().padStart(6, "0");
  }

  /**
   * Gera secret em Base32
   */
  private generateBase32Secret(length: number = 20): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      secret += chars[bytes[i] % 32];
    }
    return secret;
  }

  /**
   * Decodifica Base32
   */
  private base32Decode(encoded: string): Buffer {
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

  // =============================================
  // MÉTODOS LEGADOS (compatibilidade)
  // =============================================

  async resolveLoginIdentifier(identifier: string) {
    return this.authRepo.findByIdentifier(identifier);
  }

  async verifyCredentials(email: string, password: string) {
    const result = await this.authenticate(email, password);
    return result.success ? result.user : null;
  }

  async findByEmail(email: string) {
    const credential = await this.authRepo.findByEmail(email);
    return credential?.user || null;
  }
}
