import bcrypt from "bcryptjs";
import crypto from "crypto";
import { IAuthCredentialRepository } from "../domain/auth-credential.repository";
import { UserService } from "../../users/application/user.service";

const SALT_ROUNDS = parseInt(process.env.AUTH_SALT_ROUNDS || "12", 10);
const TOTP_WINDOW = parseInt(process.env.AUTH_TOTP_WINDOW || "30", 10);
const MFA_ISSUER = process.env.AUTH_MFA_ISSUER || "OrioN";

export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly authRepo: IAuthCredentialRepository
  ) { }

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
    [key: string]: any;
  }) {
    if (!data.password || data.password.length < 6) {
      throw new Error("Senha deve ter no mínimo 6 caracteres");
    }

    if (await this.authRepo.emailExists(data.email)) {
      throw new Error("Email já está em uso");
    }

    const newUser = await this.userService.createUser({
      ...data,
      role: data.role || "USER",
    });

    return newUser;
  }

  /**
   * Autentica usuário por qualquer identificador
   */
  async authenticate(identifier: string, password: string, mfaCode?: string) {
    let credential;

    try {
      credential = await this.authRepo.findByIdentifier(identifier);
    } catch (dbError: any) {
      console.error("[AuthService] Erro Prisma ao buscar credencial:", {
        code: dbError?.code,
        message: dbError?.message,
      });
      return { success: false, error: "DATABASE_ERROR" };
    }

    if (!credential) {
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    if (credential.status === "SUSPENDED" || credential.status === "INACTIVE") {
      return { success: false, error: "ACCOUNT_DISABLED" };
    }

    if (!credential.systemUse) {
      return { success: false, error: "SYSTEM_ACCESS_DISABLED" };
    }

    const isValidPassword = await bcrypt.compare(password, credential.password);
    if (!isValidPassword) {
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    if (credential.mfaEnabled) {
      if (!mfaCode) {
        return { success: false, error: "MFA_REQUIRED", requiresMfa: true };
      }

      if (!this.verifyTotpCode(credential.mfaSecret, mfaCode)) {
        return { success: false, error: "INVALID_MFA_CODE" };
      }
    }

    try {
      await this.authRepo.updateLastLogin(credential.userId);
    } catch (dbError: any) {
      // Não bloquear login por falha ao atualizar lastLogin
      console.error("[AuthService] Erro ao atualizar lastLogin (não-bloqueante):", {
        code: dbError?.code,
        userId: credential.userId,
      });
    }

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

  /**
   * Recupera senha usando 2FA (obrigatório)
   */
  async recoverPasswordWith2FA(
    email: string,
    mfaCode: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Senha deve ter no mínimo 6 caracteres" };
    }

    const credential = await this.authRepo.findByEmail(email);

    if (!credential) {
      return { success: false, error: "Email não encontrado" };
    }

    if (!credential.mfaEnabled || !credential.mfaSecret) {
      return {
        success: false,
        error: "MFA não está habilitado para esta conta",
      };
    }

    if (!this.verifyTotpCode(credential.mfaSecret, mfaCode)) {
      return { success: false, error: "Código 2FA inválido" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.authRepo.updatePassword(credential.userId, hashedPassword);

    return { success: true };
  }

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

    if (await this.authRepo.loginExists(login, userId)) {
      return { success: false, error: "Login já está em uso" };
    }

    await this.authRepo.setCustomLogin(userId, login);
    return { success: true };
  }

  /**
   * Gera secret para MFA
   */
  generateMfaSecret(): { secret: string; otpAuthUrl: string } {
    const secret = this.generateBase32Secret();
    const otpAuthUrl = `otpauth://totp/${MFA_ISSUER}?secret=${secret}&issuer=${MFA_ISSUER}`;

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

    const isValidPassword = await bcrypt.compare(password, credential.password);
    if (!isValidPassword) {
      return { success: false, error: "Senha inválida" };
    }

    await this.authRepo.setMfaEnabled(userId, false);
    return { success: true };
  }

  /**
   * Verifica código TOTP
   */
  private verifyTotpCode(secret: string | null, code: string): boolean {
    if (!secret || !code) return false;

    try {
      const time = Math.floor(Date.now() / 1000 / TOTP_WINDOW);

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

  private generateTotpCode(secret: string, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

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

  private generateBase32Secret(length: number = 20): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      secret += chars[bytes[i] % 32];
    }
    return secret;
  }

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
