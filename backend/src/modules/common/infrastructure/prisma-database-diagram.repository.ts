import { prisma } from "@/lib/prisma/client";
import { DatabaseDiagramRepository } from "../domain/database-diagram.repository";

export class PrismaDatabaseDiagramRepository implements DatabaseDiagramRepository {
  async findAll(orderBy: unknown): Promise<any[]> {
    return prisma.databaseDiagram.findMany({
      orderBy,
    });
  }

  async findById(id: string): Promise<any | null> {
    return prisma.databaseDiagram.findUnique({
      where: { id },
    });
  }

  async create(data: unknown): Promise<unknown> {
    return prisma.databaseDiagram.create({
      data,
    });
  }

  async update(id: string, data: unknown): Promise<unknown> {
    return prisma.databaseDiagram.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.databaseDiagram.delete({
      where: { id },
    });
  }
}
