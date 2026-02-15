export interface Span {
  id?: string;
  projectId?: string;
  companyId?: string;
  spanName?: string;
  towerStartId: string;
  towerEndId: string;
  spanLength?: number;
  heightStart?: number;
  heightEnd?: number;
  elevationStart?: number;
  elevationEnd?: number;
  sag?: number;
  tension?: number;
  weightPerMeter?: number;
  catenaryConstant?: number;
  arcLength?: number;
  horizontalAngle?: number;
  verticalAngle?: number;
  radiusOfCurvature?: number;
  cableType?: string;
  voltageKv?: number;
  cableColor?: string;
  cablePhases?: number;
  cableSpacing?: number;
  geometryData?: any;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SpanRepository {
  save(span: Span): Promise<Span>;
  saveMany(spans: Span[]): Promise<Span[]>;
  findById(id: string): Promise<Span | null>;
  findByTowers(
    projectId: string,
    towerStartId: string,
    towerEndId: string,
  ): Promise<Span | null>;
  findByProject(projectId: string): Promise<Span[]>;
  findByCompany(companyId: string): Promise<Span[]>;
  deleteById(id: string): Promise<void>;
  deleteByTowers(
    projectId: string,
    towerStartId: string,
    towerEndId: string,
  ): Promise<number>;
  deleteByProject(projectId: string): Promise<number>;
}
