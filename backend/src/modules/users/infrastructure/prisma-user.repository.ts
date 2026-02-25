import { prisma, ExtendedPrismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { UserRepository } from "../domain/user.repository";
import {
  UserEntity,
  UserFiltersDTO,
  CreateUserDTO,
  UpdateUserDTO,
} from "../domain/user.dto";
import { PrismaBaseRepository } from "../../common/infrastructure/prisma-base.repository";

export class PrismaUserRepository
  extends PrismaBaseRepository<
    UserEntity,
    CreateUserDTO,
    UpdateUserDTO,
    UserFiltersDTO
  >
  implements UserRepository
{
  protected model = this.prisma.user;

  constructor(prismaInstance?: ExtendedPrismaClient) {
    super(prismaInstance);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const authCredential = await this.prisma.authCredential.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { user: true },
    });
    return (authCredential?.user as unknown as UserEntity) ?? null;
  }

  async create(
    data: CreateUserDTO,
    select?: Record<string, unknown>,
  ): Promise<UserEntity> {
    const {
      email,
      password,
      role,
      status,
      isSystemAdmin,
      permissions,
      companyId,
      projectId,
      siteId,
      registrationNumber,
      hierarchyLevel,
      laborType,
      iapName,
      functionId,
      ...personalData
    } = data as any;

    const createData: any = {
      ...personalData,
      authCredential: {
        create: {
          email,
          password: password || "",
          role: (role as any) || "OPERATIONAL",
          status: (status as any) || "PENDING_VERIFICATION",
          isSystemAdmin: !!isSystemAdmin,
          permissions: permissions || {},
        },
      },
      affiliation: {
        create: {
          companyId,
          projectId,
          siteId,
          registrationNumber,
          hierarchyLevel: hierarchyLevel || 0,
          laborType: laborType || "MOD",
          iapName,
          functionId,
        },
      },
    };

    return this.prisma.user.create({
      data: createData,
      select: select as Prisma.UserSelect,
    }) as Promise<UserEntity>;
  }

  // Specialized update to handle nested relations (Auth, Affiliation)
  async update(
    id: string,
    data: UpdateUserDTO,
    select?: Record<string, unknown>,
  ): Promise<UserEntity> {
    const {
      email,
      password,
      role,
      status,
      isSystemAdmin,
      permissions,
      companyId,
      projectId,
      siteId,
      registrationNumber,
      hierarchyLevel,
      laborType,
      iapName,
      functionId,
      ...personalData
    } = data as any;

    const updateData: Prisma.UserUpdateInput = {
      ...personalData,
    } as unknown as Prisma.UserUpdateInput;

    // 1. Atualizar Setor de Segurança
    if (email || password || role || status || isSystemAdmin !== undefined || permissions) {
      updateData.authCredential = {
        update: {
          ...(email && { email }),
          ...(password && { password }),
          ...(role && { role: role as any }),
          ...(status && { status: status as any }),
          ...(isSystemAdmin !== undefined && { isSystemAdmin }),
          ...(permissions && { permissions }),
        },
      };
    }

    // 2. Atualizar Setor de Obra / Operacional
    const hasAffiliationData = 
      companyId !== undefined || 
      projectId !== undefined || 
      siteId !== undefined || 
      registrationNumber !== undefined ||
      hierarchyLevel !== undefined ||
      laborType !== undefined ||
      iapName !== undefined ||
      functionId !== undefined;

    if (hasAffiliationData) {
      updateData.affiliation = {
        upsert: {
          create: {
            companyId,
            projectId,
            siteId,
            registrationNumber,
            hierarchyLevel: hierarchyLevel || 0,
            laborType: laborType || "MOD",
            iapName,
            functionId,
          },
          update: {
            ...(companyId !== undefined && { companyId }),
            ...(projectId !== undefined && { projectId }),
            ...(siteId !== undefined && { siteId }),
            ...(registrationNumber !== undefined && { registrationNumber }),
            ...(hierarchyLevel !== undefined && { hierarchyLevel }),
            ...(laborType !== undefined && { laborType }),
            ...(iapName !== undefined && { iapName }),
            ...(functionId !== undefined && { functionId }),
          },
        },
      };
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: select as Prisma.UserSelect,
    }) as Promise<UserEntity>;
  }

  async updateMany(
    ids: string[],
    data: UpdateUserDTO,
  ): Promise<{ count: number }> {
    const updateInput = data as Record<string, unknown>;
    const hasComplexData =
      updateInput.zipCode ||
      updateInput.street ||
      updateInput.number ||
      updateInput.neighborhood ||
      updateInput.city ||
      updateInput.state ||
      data.email ||
      data.password ||
      data.companyId !== undefined ||
      data.projectId !== undefined ||
      data.siteId !== undefined;

    if (!hasComplexData) {
      const { ...userData } = data as Record<string, unknown>;
      return this.prisma.user.updateMany({
        where: { id: { in: ids } },
        data: userData as Prisma.UserUpdateManyMutationInput,
      });
    }

    // Fallback: Transação para dados complexos (Relações)
    return this.prisma.$transaction(async (tx) => {
      let count = 0;
      const repoWithTx = new PrismaUserRepository(tx as ExtendedPrismaClient);
      for (const id of ids) {
        await repoWithTx.update(id, data);
        count++;
      }
      return { count };
    });
  }

  async findByIdentifier(
    identifier: string,
    select?: Record<string, unknown>,
  ): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { registrationNumber: identifier },
          { cpf: identifier.replace(/\D/g, "") },
        ],
      },
      select: select as Prisma.UserSelect,
    });

    if (user) return user as unknown as UserEntity;

    const authCredential = await this.prisma.authCredential.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { login: identifier.toLowerCase().trim() },
        ],
      },
      include: { user: true },
    });

    return (authCredential?.user as unknown as UserEntity) ?? null;
  }

  async deduplicateCPFs(): Promise<number> {
    console.log("[Maintenance] Iniciando limpeza profunda de CPFs...");

    const allUsers = await this.prisma.user.findMany({
      where: { cpf: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, cpf: true },
    });

    const seen = new Set<string>();
    const toNullify: string[] = [];
    const toSanitize: { id: string; sanitized: string }[] = [];

    for (const user of allUsers) {
      const original = user.cpf as string;
      const sanitized = original.replace(/\D/g, "");

      if (!sanitized) {
        toNullify.push(user.id);
        continue;
      }

      if (seen.has(sanitized)) {
        toNullify.push(user.id);
      } else {
        seen.add(sanitized);
        if (original !== sanitized) {
          toSanitize.push({ id: user.id, sanitized });
        }
      }
    }

    let fixCount = 0;

    if (toNullify.length > 0) {
      console.log(
        `[Maintenance] Anulando ${toNullify.length} CPFs conflitantes...`,
      );
      await this.prisma.user.updateMany({
        where: { id: { in: toNullify } },
        data: { cpf: null },
      });
      fixCount += toNullify.length;
    }

    for (const item of toSanitize) {
      try {
        await this.prisma.user.update({
          where: { id: item.id },
          data: { cpf: item.sanitized },
        });
        fixCount++;
      } catch (error) {
        const err = error as Error;
        console.error(
          `[Maintenance] Erro ao sanitizar ID ${item.id}:`,
          err.message,
        );
      }
    }

    console.log(`[Maintenance] Saneamento concluído: ${fixCount} alterações.`);
    return fixCount;
  }

  async upsertAddress(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.prisma.userAddress.upsert({
      where: { userId },
      update: data as Prisma.UserAddressUpdateInput,
      create: { ...(data as Prisma.UserAddressCreateInput), userId } as any,
    }) as Promise<Record<string, unknown>>;
  }
}
