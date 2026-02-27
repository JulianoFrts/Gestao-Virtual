import { logger } from "@/lib/utils/logger";
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

  /**
   * Sobrescrever findMany para aplicar ordenação SOBERANA padrão:
   * 1. Nível de Hierarquia (Empresa) - Menor valor primeiro
   * 2. Nome Alfabético
   */
  async findMany(filters: UserFiltersDTO, take?: number, skip?: number, select?: Record<string, unknown>): Promise<UserEntity[]> {
    const { sortBy, sortOrder, ...where } = filters;
    
    // Construção de ordenação prioritária:
    // 1. Role (Ordem de definição no Enum: HELPER > ADMIN > TI...)
    // 2. hierarchyLevel (Menor valor = Maior cargo na empresa)
    // 3. Nome Alfabético
    const orderBy: any[] = [
      { authCredential: { role: 'asc' } },
      { affiliation: { hierarchyLevel: 'asc' } },
      { name: 'asc' }
    ];

    // Se houver um sortBy explícito, inserimos no topo da pilha
    if (sortBy) {
      orderBy.unshift({ [sortBy]: sortOrder || 'asc' });
    }

    return this.prisma.user.findMany({
      where: where as any,
      take,
      skip,
      select: select as Prisma.UserSelect,
      orderBy
    }) as unknown as UserEntity[];
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const authCredential = await this.prisma.authCredential.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { user: true },
    });
    return (authCredential?.user as UserEntity) ?? null;
  }

  private mapRole(role?: string): Prisma.Role {
    if (!role) return "OPERATIONAL";
    const r = role.toUpperCase();
    
    // 1. Verificar se já é um valor exato do Enum atual (Prioridade)
    const validRoles: Prisma.Role[] = [
      "HELPER_SYSTEM",
      "ADMIN",
      "TI_SOFTWARE",
      "COMPANY_ADMIN",
      "PROJECT_MANAGER",
      "SITE_MANAGER",
      "SUPERVISOR",
      "OPERATIONAL",
      "VIEWER"
    ];
    
    if (validRoles.includes(r as Prisma.Role)) {
      return r as Prisma.Role;
    }

    // 2. Mapeamento de Compatibilidade Legada
    if (r === "SUPER_ADMIN_GOD") return "HELPER_SYSTEM";
    if (r === "ADMIN") return "ADMIN";
    if (r === "TI" || r === "SUPPORT" || r === "SOFTWARE") return "TI_SOFTWARE";
    if (r === "MODERATOR") return "COMPANY_ADMIN";
    if (r === "MANAGER") return "PROJECT_MANAGER";
    if (r === "GESTOR_PROJECT") return "PROJECT_MANAGER";
    if (r === "GESTOR_CANTEIRO") return "SITE_MANAGER";
    if (r === "TECHNICIAN") return "SITE_MANAGER";
    if (r === "WORKER") return "OPERATIONAL";
    if (r === "USER") return "OPERATIONAL";

    return "OPERATIONAL";
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
    } = data;

    const createData: Prisma.UserCreateInput = {
      ...personalData,
      authCredential: {
        create: {
          email,
          password: password || "",
          role: this.mapRole(role as string),
          status: (status as Prisma.AccountStatus) || "PENDING_VERIFICATION",
          isSystemAdmin: !!isSystemAdmin,
          permissions: (permissions as Prisma.InputJsonValue) || {},
        },
      },
      affiliation: {
        create: {
          companyId,
          projectId,
          siteId,
          registrationNumber,
          hierarchyLevel: hierarchyLevel || 0,
          laborType: (laborType as Prisma.LaborType) || "MOD",
          iapName,
          functionId,
        },
      },
      address: data.zipCode ? {
        create: {
          cep: String(data.zipCode),
          logradouro: String(data.street || ""),
          unidade: String(data.number || ""),
          complemento: String(data.complement || ""),
          bairro: String(data.neighborhood || ""),
          localidade: String(data.city || ""),
          estado: String(data.state || ""),
          uf: String((data.state as string)?.substring(0, 2).toUpperCase() || "SP"),
        }
      } : undefined
    };

    const user = await this.prisma.user.create({
      data: createData,
      select: select as Prisma.UserSelect,
    });
    return user as UserEntity;
  }

  // Specialized update to handle nested relations (Auth, Affiliation, Address)
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
      // Endereço
      zipCode,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      ...personalData
    } = data as unknown;

    const updateData: Prisma.UserUpdateInput = {
      ...personalData,
    };

    // 1. Atualizar Setor de Segurança
    if (email || password || role || status || isSystemAdmin !== undefined || permissions) {
      updateData.authCredential = {
        upsert: {
          update: {
            ...(email && { email }),
            ...(password && { password }),
            ...(role && { role: this.mapRole(role as string) }),
            ...(status && { status: status as Prisma.AccountStatus }),
            ...(isSystemAdmin !== undefined && { isSystemAdmin }),
            ...(permissions && { permissions: permissions as Prisma.InputJsonValue }),
          },
          create: {
            email: email || "",
            password: password || "",
            role: this.mapRole(role as string),
            status: (status as Prisma.AccountStatus) || "ACTIVE",
            isSystemAdmin: !!isSystemAdmin,
            permissions: (permissions as Prisma.InputJsonValue) || {},
          }
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

    // 3. Atualizar Endereço
    const hasAddressData = 
      zipCode !== undefined ||
      street !== undefined ||
      number !== undefined ||
      complement !== undefined ||
      neighborhood !== undefined ||
      city !== undefined ||
      state !== undefined;

    if (hasAddressData) {
      updateData.address = {
        upsert: {
          create: {
            cep: String(zipCode || ""),
            logradouro: String(street || ""),
            unidade: String(number || ""),
            complemento: String(complement || ""),
            bairro: String(neighborhood || ""),
            localidade: String(city || ""),
            estado: String(state || ""),
            uf: String((state as string)?.substring(0, 2).toUpperCase() || "SP"),
          },
          update: {
            ...(zipCode !== undefined && { cep: String(zipCode) }),
            ...(street !== undefined && { logradouro: String(street) }),
            ...(number !== undefined && { unidade: String(number) }),
            ...(complement !== undefined && { complemento: String(complement) }),
            ...(neighborhood !== undefined && { bairro: String(neighborhood) }),
            ...(city !== undefined && { localidade: String(city) }),
            ...(state !== undefined && { estado: String(state) }),
          },
        },
      };
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: select as Prisma.UserSelect,
    });
    return user as UserEntity;
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
          { affiliation: { registrationNumber: identifier } },
          { cpf: identifier.replace(/\D/g, "") },
        ],
      },
      select: select as Prisma.UserSelect,
    });

    if (user) return user as UserEntity;

    const authCredential = await this.prisma.authCredential.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { login: identifier.toLowerCase().trim() },
        ],
      },
      include: { user: true },
    });

    return (authCredential?.user as UserEntity) ?? null;
  }

  async deduplicateCPFs(): Promise<number> {
    logger.debug("[Maintenance] Iniciando limpeza profunda de CPFs...");

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
      logger.debug(
        `[Maintenance] Anulando ${toNullify.length} CPFs conflitantes...`,
      );
      await this.prisma.user.updateMany({
        where: { id: { in: toNullify } },
        data: { cpf: null },
      });
      fixCount += toNullify.length;
    }

    for (const element of toSanitize) {
      try {
        await this.prisma.user.update({
          where: { id: element.id },
          data: { cpf: element.sanitized },
        });
        fixCount++;
      } catch (error) {
        const err = error as Error;
        console.error(
          `[Maintenance] Erro ao sanitizar ID ${element.id}:`,
          err.message,
        );
      }
    }

    logger.debug(`[Maintenance] Saneamento concluído: ${fixCount} alterações.`);
    return fixCount;
  }

  async upsertAddress(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const mapped: any = {};
    if (data.zipCode) mapped.cep = data.zipCode;
    if (data.street) mapped.logradouro = data.street;
    if (data.number) mapped.unidade = data.number;
    if (data.complement) mapped.complemento = data.complement;
    if (data.neighborhood) mapped.bairro = data.neighborhood;
    if (data.city) mapped.localidade = data.city;
    if (data.state) {
        mapped.estado = data.state;
        mapped.uf = String(data.state).substring(0, 2).toUpperCase();
    }

    return this.prisma.userAddress.upsert({
      where: { userId },
      update: mapped,
      create: { ...mapped, userId },
    }) as any;
  }
}
