import { prisma } from "@/lib/prisma/client";
import {
  Segment,
  SegmentRepository,
} from "@/modules/segment/domain/segment.repository";
import { randomUUID } from "crypto";

export class PrismaSegmentRepository implements TowerSegmentRepository {
  async save(segment: Segment): Promise<Segment> {
    const { id, conductors, ...data } = segment;

    if (id) {
      return this.handleUpdate(id, data, conductors);
    }

    return this.handleUpsert(data, conductors);
  }

  private async handleUpdate(
    id: string,
    data: unknown,
    conductors: unknown[] | undefined,
  ): Promise<Segment> {
    const towerStartId = data.towerStartId || data.tower_start_id;
    const towerEndId = data.towerEndId || data.tower_end_id;

    await prisma.segment.update({
      where: { id },
      data: {
        projectId: data.projectId,
        fromTowerId: towerStartId,
        toTowerId: towerEndId,
        length: data.spanLength || data.length,
        groundLevel: data.elevationStart || data.groundLevel,
      },
      include: { conductors: true },
    });

    if (conductors) {
      await this.updateConductors(id, conductors);
    }
    return this.findById(id) as Promise<Segment>;
  }

  private async handleUpsert(
    data: unknown,
    conductors: unknown[] | undefined,
  ): Promise<Segment> {
    const towerStartId = data.towerStartId || data.tower_start_id;
    const towerEndId = data.towerEndId || data.tower_end_id;

    const whereInput = {
      projectId_fromTowerId_toTowerId: {
        projectId: data.projectId,
        fromTowerId: towerStartId,
        toTowerId: towerEndId,
      },
    };

    const existing = await prisma.segment.findUnique({ where: whereInput });

    if (existing) {
      await prisma.segment.update({
        where: { id: existing.id },
        data: {
          length: data.spanLength || data.length,
          groundLevel: data.elevationStart || data.groundLevel,
        },
      });

      if (conductors) {
        await this.updateConductors(existing.id, conductors);
      }
      return this.findById(existing.id) as Promise<Segment>;
    } else {
      const created = await prisma.segment.create({
        data: {
          projectId: data.projectId,
          fromTowerId: towerStartId,
          toTowerId: towerEndId,
          length: data.spanLength || data.length,
          groundLevel: data.elevationStart || data.groundLevel || 0,
          conductors: {
            create: this.mapConductorsForCreate(conductors),
          },
        },
        include: { conductors: true },
      });
      return this.mapFromPrisma(created);
    }
  }

  private async updateConductors(segmentId: string, conductors: unknown[]) {
    await prisma.conductor.deleteMany({ where: { segmentId } });

    // Using individual creates or a loop since createMany doesn't handle IDs automatically if not defined in schema
    for (const c of conductors) {
      await prisma.conductor.create({
        data: {
          id: c.id || randomUUID(),
          segmentId: segmentId,
          phase: c.phase,
          circuitId: c.circuitId,
          cableType: c.cableType,
          voltageKv: c.voltageKv,
          color: c.cableColor,
        },
      });
    }
  }

  private mapConductorsForCreate(conductors?: unknown[]) {
    return conductors?.map((c) => ({
      id: c.id || randomUUID(),
      phase: c.phase,
      circuitId: c.circuitId,
      cableType: c.cableType,
      voltageKv: c.voltageKv,
      color: c.cableColor,
    }));
  }

  async saveMany(segments: Segment[]): Promise<Segment[]> {
    const results: Segment[] = [];
    for (const seg of segments) {
      results.push(await this.save(seg));
    }
    return results;
  }

  async findById(id: string): Promise<Segment | null> {
    const result = await prisma.segment.findUnique({
      where: { id },
      include: { conductors: true, segmentCircuits: true },
    });
    return result ? this.mapFromPrisma(result) : null;
  }

  async findByProject(projectId: string): Promise<Segment[]> {
    const results = await prisma.segment.findMany({
      where: { projectId },
      include: { conductors: true },
      orderBy: { createdAt: "desc" },
    });
    return results.map((r) => this.mapFromPrisma(r));
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
    return results.map((r) => this.mapFromPrisma(r));
  }

  private mapFromPrisma(prismaSegment: unknown): Segment {
    return {
      id: prismaSegment.id,
      projectId: prismaSegment.projectId,
      towerStartId: prismaSegment.fromTowerId,
      towerEndId: prismaSegment.toTowerId,
      spanLength: prismaSegment.length
        ? Number(prismaSegment.length)
        : undefined,
      elevationStart: prismaSegment.groundLevel
        ? Number(prismaSegment.groundLevel)
        : undefined,
      conductors: prismaSegment.conductors?.map((c: unknown) => ({
        id: c.id,
        segmentId: c.segmentId,
        phase: c.phase,
        circuitId: c.circuitId,
        cableType: c.cableType,
        voltageKv: c.voltageKv ? Number(c.voltageKv) : undefined,
        cableColor: c.color,
      })),
      createdAt: prismaSegment.createdAt,
      updatedAt: prismaSegment.updatedAt,
    };
  }

  async deleteById(id: string): Promise<void> {
    await prisma.segment.delete({ where: { id } });
  }
}

// Alias for compatibility if needed elsewhere
export type TowerSegmentRepository = SegmentRepository;
