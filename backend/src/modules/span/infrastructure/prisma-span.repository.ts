import { prisma } from "@/lib/prisma/client";
import { Span, SpanRepository } from "@/modules/span/domain/span.repository";

export class PrismaSpanRepository implements SpanRepository {
  async save(span: Span): Promise<Span> {
    const { id, ...data } = span;

    const prismaData = this.buildPrismaData(data);

    if (id) {
      const updated = await prisma.segment.update({
        where: { id },
        data: prismaData,
      });
      return this.mapToSpan(updated);
    }

    const whereInput = {
      projectId_fromTowerId_toTowerId: {
        projectId: data.projectId!,
        fromTowerId: data.towerStartId,
        toTowerId: data.towerEndId,
      },
    };

    const existing = await prisma.segment.findUnique({ where: whereInput });

    if (existing) {
      const updated = await prisma.segment.update({
        where: { id: existing.id },
        data: prismaData,
      });
      return this.mapToSpan(updated);
    }

    const created = await prisma.segment.create({
      data: prismaData,
    });
    return this.mapToSpan(created);
  }

  private buildPrismaData(data: any): any {
    return {
      projectId: data.projectId,
      fromTowerId: data.towerStartId,
      toTowerId: data.towerEndId,
      length: data.spanLength,
      groundLevel: data.elevationStart || 0,
    };
  }

  async saveMany(spans: Span[]): Promise<Span[]> {
    const results: Span[] = [];
    for (const span of spans) {
      results.push(await this.save(span));
    }
    return results;
  }

  async findById(id: string): Promise<Span | null> {
    const result = await prisma.segment.findUnique({
      where: { id },
    });
    return result ? this.mapToSpan(result) : null;
  }

  async findByTowers(
    projectId: string,
    towerStartId: string,
    towerEndId: string,
  ): Promise<Span | null> {
    const result = await prisma.segment.findUnique({
      where: {
        projectId_fromTowerId_toTowerId: {
          projectId,
          fromTowerId: towerStartId,
          toTowerId: towerEndId,
        },
      },
    });
    return result ? this.mapToSpan(result) : null;
  }

  async findByProject(projectId: string): Promise<Span[]> {
    const results = await prisma.segment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return results.map((r) => this.mapToSpan(r));
  }

  async findByCompany(companyId: string): Promise<Span[]> {
    const results = await prisma.segment.findMany({
      where: {
        project: { companyId },
      },
      orderBy: { createdAt: "desc" },
    });
    return results.map((r) => this.mapToSpan(r));
  }

  async deleteById(id: string): Promise<void> {
    await prisma.segment.delete({ where: { id } });
  }

  async deleteByTowers(
    projectId: string,
    towerStartId: string,
    towerEndId: string,
  ): Promise<number> {
    const result = await prisma.segment.deleteMany({
      where: {
        projectId,
        fromTowerId: towerStartId,
        toTowerId: towerEndId,
      },
    });
    return result.count;
  }

  async deleteByProject(projectId: string): Promise<number> {
    const result = await prisma.segment.deleteMany({
      where: { projectId },
    });
    return result.count;
  }

  private mapToSpan(prismaSegment: any): Span {
    return {
      id: prismaSegment.id,
      projectId: prismaSegment.projectId,
      towerStartId: prismaSegment.fromTowerId,
      towerEndId: prismaSegment.toTowerId,
      spanLength: Number(prismaSegment.length || 0),
      elevationStart: Number(prismaSegment.groundLevel || 0),
      createdAt: prismaSegment.createdAt,
      updatedAt: prismaSegment.updatedAt,
    } as Span;
  }
}
