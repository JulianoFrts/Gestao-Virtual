import { prisma } from "@/lib/prisma/client";
import { User, Prisma } from "@prisma/client";
import { UserRepository } from "../domain/user.repository";

export class PrismaUserRepository implements UserRepository {
  private prisma: any;

  constructor(prismaInstance?: any) {
    this.prisma = prismaInstance || prisma;
  }

  async findAll(params: {
    where: Prisma.UserWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    select?: Prisma.UserSelect;
  }): Promise<Partial<User>[]> {
    return this.prisma.user.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      select: params.select,
    });
  }

  async count(where: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  async findById(
    id: string,
    select?: Prisma.UserSelect,
  ): Promise<Partial<User> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select,
    });
  }

  async findByEmail(email: string): Promise<Partial<User> | null> {
    const authCredential = await this.prisma.authCredential.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { user: true },
    });
    return authCredential?.user ?? null;
  }

  async create(data: any, select?: Prisma.UserSelect): Promise<Partial<User>> {
    const {
      id: _bodyId,
      email,
      password,
      role,
      status,
      companyId,
      projectId,
      siteId,
      zipCode,
      street,
      number,
      neighborhood,
      city,
      state,
      fullName,
      mfa_enabled,
      mfa_secret,
      ...userData
    } = data;

    const createData: any = {
      ...userData,
      authCredential: {
        create: {
          email,
          password,
          role: role || "USER",
          status: status || "PENDING_VERIFICATION",
          mfaEnabled: mfa_enabled ?? false,
          mfaSecret: mfa_secret || null,
        },
      },
    };

    if (companyId || projectId || siteId) {
      createData.affiliation = {
        create: {
          companyId,
          projectId,
          siteId,
        },
      };
    }

    if (zipCode || street || neighborhood || city || state) {
      createData.address = {
        create: {
          cep: zipCode || "",
          street: street || "",
          number: number || "",
          neighborhood: neighborhood || "",
          city: city || "",
          stateCode: state || "null",
          stateName: "",
        },
      };
    }

    return this.prisma.user.create({
      data: createData,
      select,
    });
  }

  async update(
    id: string,
    data: any,
    select?: Prisma.UserSelect,
  ): Promise<Partial<User>> {
    const {
      id: _bodyId,
      email,
      password,
      role,
      status,
      companyId,
      projectId,
      siteId,
      zipCode,
      street,
      number,
      neighborhood,
      city,
      state,
      fullName,
      mfa_enabled,
      mfa_secret,
      ...userData
    } = data;

    const updateData: any = { ...userData };

    if (
      email ||
      password ||
      role ||
      status ||
      mfa_enabled !== undefined ||
      mfa_secret !== undefined
    ) {
      updateData.authCredential = {
        update: {
          ...(email && { email }),
          ...(password && { password }),
          ...(role && { role }),
          ...(status && { status }),
          ...(mfa_enabled !== undefined && { mfaEnabled: mfa_enabled }),
          ...(mfa_secret !== undefined && { mfaSecret: mfa_secret }),
        },
      };
    }

    if (
      companyId !== undefined ||
      projectId !== undefined ||
      siteId !== undefined
    ) {
      updateData.affiliation = {
        upsert: {
          create: {
            companyId,
            projectId,
            siteId,
          },
          update: {
            ...(companyId !== undefined && { companyId }),
            ...(projectId !== undefined && { projectId }),
            ...(siteId !== undefined && { siteId }),
          },
        },
      };
    }

    if (
      zipCode !== undefined ||
      street !== undefined ||
      number !== undefined ||
      neighborhood !== undefined ||
      city !== undefined ||
      state !== undefined
    ) {
      updateData.address = {
        upsert: {
          create: {
            cep: zipCode || "",
            street: street || "",
            number: number || "",
            neighborhood: neighborhood || "",
            city: city || "",
            stateCode: state || "",
            stateName: "",
          },
          update: {
            ...(zipCode !== null && { cep: zipCode }),
            ...(street !== null && { street }),
            ...(number !== null && { number }),
            ...(neighborhood !== null && { neighborhood }),
            ...(city !== null && { city }),
            ...(state !== null && { stateCode: state }),
          },
        },
      };
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findByIdentifier(
    identifier: string,
    select?: Prisma.UserSelect,
  ): Promise<Partial<User> | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { registrationNumber: identifier },
          { cpf: identifier.replace(/\D/g, "") },
        ],
      },
      select,
    });

    if (user) return user;

    const authCredential = await this.prisma.authCredential.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { login: identifier.toLowerCase().trim() },
        ],
      },
      include: { user: true },
    });

    return authCredential?.user ?? null;
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
      console.log(`[Maintenance] Anulando ${toNullify.length} CPFs conflitantes...`);
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
        console.error(`[Maintenance] Erro ao sanitizar ID ${item.id}:`, error);
      }
    }

    console.log(`[Maintenance] Saneamento concluído: ${fixCount} alterações.`);
    return fixCount;
  }

  async upsertAddress(userId: string, data: any): Promise<any> {
    return this.prisma.userAddress.upsert({
      where: { userId },
      update: data,
      create: { ...data, userId },
    });
  }
}
