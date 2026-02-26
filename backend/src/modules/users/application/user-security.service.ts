import bcrypt from "bcryptjs";
import { CONSTANTS } from "@/lib/constants";
import { UserRepository } from "../domain/user.repository";
import { SystemAuditRepository } from "../../audit/domain/system-audit.repository";
import {
  isGodRole,
  isSystemOwner,
  SECURITY_RANKS,
} from "@/lib/constants/security";

export class UserSecurityService {
  constructor(
    private readonly repository: UserRepository,
    private readonly auditRepository?: SystemAuditRepository,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, CONSTANTS.AUTH.PASSWORD.BCRYPT_ROUNDS);
  }

  async changePassword(
    userId: string,
    data: { currentPassword?: string; newPassword?: string; password?: string },
    performerId?: string,
  ): Promise<void> {
    const user = await this.repository.findById(userId, {
      id: true,
      authCredential: { select: { password: true } },
    });

    if (!user) throw new Error("User not found");

    let newPasswordToHash: string;

    if (data.password && !data.currentPassword) {
      newPasswordToHash = data.password;
    } else if (data.currentPassword && data.newPassword) {
      const auth = user.authCredential as unknown;
      if (!auth?.password)
        throw new Error("User has no password set");
      const isValidPassword = await bcrypt.compare(
        data.currentPassword,
        auth.password,
      );
      if (!isValidPassword) throw new Error("Invalid current password");
      newPasswordToHash = data.newPassword;
    } else {
      throw new Error("Invalid password change data");
    }

    const hashedPassword = await this.hashPassword(newPasswordToHash);

    // Agora usando o DTO tipado, sem necessidade de 'as unknown'
    await this.repository.update(userId, { password: hashedPassword });

    if (this.auditRepository) {
      await this.auditRepository.log({
        userId: performerId || userId,
        action: "PASSWORD_CHANGE",
        entity: "User",
        entityId: userId,
        newValues: { password: "[" + "CHANGED" + "]" },
      });
    }
  }

  async validateHierarchySovereignty(
    performerId: string,
    targetId: string,
    targetLevel: number,
  ): Promise<void> {
    if (performerId === targetId) return;

    const performer = await this.repository.findById(performerId, {
      affiliation: { select: { hierarchyLevel: true } },
      authCredential: { select: { role: true } },
    });

    if (!performer) return;

    const performerRole = performer.authCredential?.role || "";
    const performerLevel = performer.affiliation?.hierarchyLevel || 0;
    const isGod =
      isGodRole(performerRole) || performerLevel >= SECURITY_RANKS.MASTER;

    if (!isGod && performerLevel <= targetLevel) {
      throw new Error(
        "Soberania de Hierarquia: Você não pode modificar um usuário de nível igual ou superior ao seu.",
      );
    }
  }

  async validatePromotionPermission(
    performerId: string,
    newRole: string,
    newLevel: number,
  ): Promise<void> {
    const performer = await this.repository.findById(performerId, {
      affiliation: { select: { hierarchyLevel: true } },
      authCredential: { select: { role: true } },
    });

    if (!performer) return;

    const performerRole = performer.authCredential?.role || "";
    const performerLevel = performer.affiliation?.hierarchyLevel || 0;
    const isGod =
      isGodRole(performerRole) || performerLevel >= SECURITY_RANKS.MASTER;

    if (!isGod && newLevel > performerLevel) {
      throw new Error(
        `Segurança: Você (Nível ${performerLevel}) não tem permissão para promover um usuário ao cargo de ${newRole} (Nível ${newLevel}).`,
      );
    }
  }

  async validateSystemAdminFlag(
    performerId: string,
    isSystemAdmin: boolean,
    currentIsSystemAdmin: boolean,
  ): Promise<void> {
    if (isSystemAdmin === currentIsSystemAdmin) return;

    const performer = await this.repository.findById(performerId, {
      authCredential: { select: { role: true } },
    });

    if (!performer) return;

    const performerRole = performer.authCredential?.role || "";
    if (!isSystemOwner(performerRole)) {
      throw new Error(
        "Segurança Crítica: Apenas Super Administradores podem conceder ou revogar status de System Admin.",
      );
    }
  }
}
