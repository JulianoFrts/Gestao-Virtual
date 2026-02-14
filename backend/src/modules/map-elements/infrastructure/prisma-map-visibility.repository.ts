import { prisma } from "@/lib/prisma/client";
import { MapVisibilityRepository } from "../domain/map-visibility.repository";

export class PrismaMapVisibilityRepository implements MapVisibilityRepository {
  async findMany(where: any): Promise<any[]> {
    return prisma.mapElementVisibility.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async findFirst(where: any): Promise<any | null> {
    return prisma.mapElementVisibility.findFirst({ where });
  }

  async create(data: any): Promise<any> {
    return prisma.mapElementVisibility.create({ data });
  }

  async update(id: string, data: any): Promise<any> {
    return prisma.mapElementVisibility.update({
      where: { id },
      data,
    });
  }

  async updateMany(where: any, data: any): Promise<{ count: number }> {
    return prisma.mapElementVisibility.updateMany({ where, data });
  }
}
