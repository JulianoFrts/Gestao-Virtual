import { prisma } from "@/lib/prisma/client";
import { UserRoleRepository } from "../domain/user-role.repository";

export class PrismaUserRoleRepository implements UserRoleRepository {
  async findByUserId(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        authCredential: {
          select: { role: true },
        },
      },
    });

    if (!user) return [];

    const mapped = {
      id: user.id,
      role: (user as unknown).authCredential?.role || "OPERATIONAL",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Return virtual role object for compatibility
    return [this.mapToUserRole(mapped)];
  }

  async create(data: unknown): Promise<unknown> {
    // Assume data contains userId and role
    const authCred = await prisma.authCredential.update({
      where: { userId: data.userId },
      data: { role: data.role },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const mapped = {
      id: authCred.user.id,
      role: authCred.role,
      createdAt: authCred.user.createdAt,
      updatedAt: authCred.user.updatedAt,
    };

    return this.mapToUserRole(mapped);
  }

  async delete(id: string): Promise<void> {
    // Cannot delete a user's role entirely if it's an enum, but can reset it
    const userId = this.extractUserId(id);
    await prisma.authCredential.update({
      where: { userId: userId },
      data: { role: "OPERATIONAL" }, // Reset to default
    });
  }

  async update(id: string, data: unknown): Promise<unknown> {
    const userId = this.extractUserId(id);

    const authCred = await prisma.authCredential.update({
      where: { userId: userId },
      data: { role: data.role },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const mapped = {
      id: authCred.user.id,
      role: authCred.role,
      createdAt: authCred.user.createdAt,
      updatedAt: authCred.user.updatedAt,
    };

    return this.mapToUserRole(mapped);
  }

  private extractUserId(id: string): string {
    return id.startsWith("role-") ? id.substring(5) : id;
  }

  private mapToUserRole(user: unknown): any {
    return {
      id: `role-${user.id}`,
      userId: user.id,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
