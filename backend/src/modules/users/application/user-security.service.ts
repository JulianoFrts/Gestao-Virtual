import bcrypt from "bcryptjs";
import { CONSTANTS } from "@/lib/constants";
import { UserRepository } from "../domain/user.repository";
import { SystemAuditRepository } from "../../audit/domain/system-audit.repository";

export class UserSecurityService {
  constructor(
    private readonly repository: UserRepository,
    private readonly auditRepository?: SystemAuditRepository,
  ) { }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, CONSTANTS.AUTH.PASSWORD.BCRYPT_ROUNDS);
  }

  async changePassword(
    userId: string,
    data: { currentPassword?: string; newPassword?: string; password?: string },
    performerId?: string,
  ) {
    const user = await this.repository.findById(userId, {
      id: true,
      authCredential: { select: { password: true } },
    } as any);
    if (!user) throw new Error("User not found");

    let newPasswordToHash: string;

    if (data.password && !data.currentPassword) {
      newPasswordToHash = data.password;
    } else if (data.currentPassword && data.newPassword) {
      if (!(user as any).authCredential?.password) throw new Error("User has no password set");
      const isValidPassword = await bcrypt.compare(
        data.currentPassword,
        (user as any).authCredential.password as string,
      );
      if (!isValidPassword) throw new Error("Invalid current password");
      newPasswordToHash = data.newPassword;
    } else {
      throw new Error("Invalid password change data");
    }

    const hashedPassword = await this.hashPassword(newPasswordToHash);
    await this.repository.update(userId, { password: hashedPassword } as any);

    if (this.auditRepository) {
      await this.auditRepository.log({
        userId: performerId || userId,
        action: "PASSWORD_CHANGE",
        entity: "User",
        entityId: userId,
        newValues: { password: "[CHANGED]" },
      });
    }
  }
}
