import { prisma } from "@/lib/prisma/client";
import { MapVisibilityRepository } from "../domain/map-visibility.repository";

export class PrismaMapVisibilityRepository implements MapVisibilityRepository {
  async findMany(where: unknown): Promise<any[]> {
    return prisma.mapElementVisibility.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async findFirst(where: unknown): Promise<any | null> {
    return prisma.mapElementVisibility.findFirst({ where });
  }

  async create(data: unknown): Promise<unknown> {
    return prisma.mapElementVisibility.create({ data });
  }

  async update(id: string, data: unknown): Promise<unknown> {
    return prisma.mapElementVisibility.update({
      where: { id },
      data,
    });
  }

  async updateMany(where: unknown, data: unknown): Promise<{ count: number }> {
    return prisma.mapElementVisibility.updateMany({ where, data });
  }
}
