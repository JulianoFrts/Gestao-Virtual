import { prisma } from "@/lib/prisma/client";
import {
  Segment,
  SegmentRepository,
} from "@/core/segment/domain/segment.repository";

export class PrismaSegmentRepository implements SegmentRepository {
  async save(segment: Segment): Promise<Segment> {
    const { id, conductors, ...data } = segment;

    // If ID is provided, update by ID
    if (id) {
      return this.handleUpdate(id, data, conductors);
    }

    // Upsert by Unique Constraint
    return this.handleUpsert(data, conductors);
  }

  private async handleUpdate(
    id: string,
    data: any,
    conductors: any[] | undefined,
  ): Promise<Segment> {
    await prisma.segment.update({
      where: { id },
      data: {
        projectId: data.projectId,
        fromTowerId: data.towerStartId,
        toTowerId: data.towerEndId,
        length: data.spanLength,
        groundLevel: data.elevationStart,
      },
      include: { conductors: true },
    });

    if (conductors) {
      await this.updateConductors(id, conductors);
    }
    return this.findById(id) as unknown as Promise<Segment>;
  }

  private async handleUpsert(
    data: any,
    conductors: any[] | undefined,
  ): Promise<Segment> {
    const whereInput = {
      projectId_fromTowerId_toTowerId: {
        projectId: data.projectId,
        fromTowerId: data.towerStartId,
        toTowerId: data.towerEndId,
      },
    };

    const existing = await prisma.segment.findUnique({ where: whereInput });

    if (existing) {
      // Update
      await prisma.segment.update({
        where: { id: existing.id },
        data: {
          length: data.spanLength,
          groundLevel: data.elevationStart,
        },
      });

      if (conductors) {
        await this.updateConductors(existing.id, conductors);
      }
      return this.findById(existing.id) as unknown as Promise<Segment>;
    } else {
      // Create
      const createData = {
        projectId: data.projectId,
        fromTowerId: data.towerStartId,
        toTowerId: data.towerEndId,
        length: data.spanLength,
        groundLevel: data.elevationStart || 0,
        conductors: {
          create: this.mapConductorsForCreate(conductors),
        },
      };

      const created = await prisma.segment.create({
        data: createData,
        include: { conductors: true },
      });
      return created as unknown as Segment;
    }
  }

  private async updateConductors(segmentId: string, conductors: any[]) {
    await prisma.conductor.deleteMany({ where: { segmentId } });
    await prisma.conductor.createMany({
      data: conductors.map((c) => ({
        segmentId: segmentId,
        phase: c.phase,
        circuitId: c.circuitId,
        cableType: c.cableType,
        voltageKv: c.voltageKv,
        color: c.cableColor,
      })),
    });
  }

  private mapConductorsForCreate(conductors?: any[]) {
    return conductors?.map((c) => ({
      phase: c.phase,
      circuitId: c.circuitId,
      cableType: c.cableType,
      voltageKv: c.voltageKv,
      color: c.cableColor,
    }));
  }

  async saveMany(segments: Segment[]): Promise<Segment[]> {
    // Prisma createMany doesn't support nested writes (conductors), so we loop
    const results: Segment[] = [];
    for (const seg of segments) {
      results.push(await this.save(seg));
    }
    return results;
  }

  async findById(id: string): Promise<Segment | null> {
    const result = await prisma.segment.findUnique({
      where: { id },
      include: { conductors: true, circuits: true },
    });
    return result as unknown as Segment | null;
  }

  async findByProject(projectId: string): Promise<Segment[]> {
    const results = await prisma.segment.findMany({
      where: { projectId },
      include: { conductors: true },
      orderBy: { createdAt: "desc" },
    });
    return results as unknown as Segment[];
  }

  async findByCompany(companyId: string): Promise<Segment[]> {
    const results = await prisma.segment.findMany({
      where: {
        project: {
          companyId: companyId,
        },
      },
      include: { conductors: true },
      orderBy: { projectId: "asc" },
    });
    return results as unknown as Segment[];
  }

  async deleteById(id: string): Promise<void> {
    await prisma.segment.delete({ where: { id } });
  }
}
