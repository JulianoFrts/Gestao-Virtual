export interface Conductor {
  id?: string;
  segmentId: string;
  phase: string; // A, B, C, NEUTRAL, GUARD
  circuitId?: string;
  cableType?: string;
  voltageKv?: number;
  cableColor?: string;
}

export interface Segment {
  id?: string;
  projectId: string;
  towerStartId: string;
  towerEndId: string;
  spanLength?: number;
  heightStart?: number;
  heightEnd?: number;
  elevationStart?: number;
  elevationEnd?: number;
  conductors?: Conductor[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SegmentRepository {
  save(segment: Segment): Promise<Segment>;
  saveMany(segments: Segment[]): Promise<Segment[]>;
  findById(id: string): Promise<Segment | null>;
  findByProject(projectId: string): Promise<Segment[]>;
  findByCompany(companyId: string): Promise<Segment[]>;
  deleteById(id: string): Promise<void>;
}
