import { z } from "zod";

export const towerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  projectId: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  company_id: z.string().optional().nullable(),
  objectId: z.string().optional().nullable(),
  object_id: z.string().optional().nullable(),
  objectSeq: z.number().optional().nullable(),
  object_seq: z.number().optional().nullable(),
  towerType: z.string().optional().nullable(),
  tower_type: z.string().optional().nullable(),
  objectHeight: z.number().optional().nullable(),
  object_height: z.number().optional().nullable(),
  objectElevation: z.number().optional().nullable(),
  object_elevation: z.number().optional().nullable(),
  xCoordinate: z.number().optional().nullable(),
  x_coordinate: z.number().optional().nullable(),
  x_cord_object: z.number().optional().nullable(),
  yCoordinate: z.number().optional().nullable(),
  y_coordinate: z.number().optional().nullable(),
  y_cord_object: z.number().optional().nullable(),
  deflection: z.string().optional().nullable(),
  goForward: z.number().optional().nullable(),
  go_forward: z.number().optional().nullable(),
  fusoObject: z.string().optional().nullable(),
  fuso_object: z.string().optional().nullable(),
  fixConductor: z.union([z.string(), z.number()]).optional().nullable(),
  fix_conductor: z.union([z.string(), z.number()]).optional().nullable(),
  trecho: z.string().optional().nullable(),
  totalConcreto: z.number().optional().nullable(),
  total_concreto: z.number().optional().nullable(),
  pesoArmacao: z.number().optional().nullable(),
  peso_armacao: z.number().optional().nullable(),
  pesoEstrutura: z.number().optional().nullable(),
  peso_estrutura: z.number().optional().nullable(),
  tramoLancamento: z.string().optional().nullable(),
  tramo_lancamento: z.string().optional().nullable(),
  tipificacaoEstrutura: z.string().optional().nullable(),
  tipificacao_estrutura: z.string().optional().nullable(),
  tipoFundacao: z.string().optional().nullable(),
  tipo_fundacao: z.string().optional().nullable(),
  // New Fields (2026)
  isHidden: z.boolean().optional().nullable(),
  is_hidden: z.boolean().optional().nullable(),
  distance: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  technicalKm: z.number().optional().nullable(),
  technical_km: z.number().optional().nullable(),
  technicalIndex: z.number().optional().nullable(),
  technical_index: z.number().optional().nullable(),
  circuitId: z.string().optional().nullable(),
  circuit_id: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type TowerDTO = z.infer<typeof towerSchema>;

export function mapDtoToEntity(dto: TowerDTO): any {
  const data: Record<string, unknown> = {
    ...mapIdentification(dto),
    ...mapGeospatial(dto),
    ...mapTechnicalSpecs(dto),
    ...mapLegacyAndNewFields(dto),
    metadata: dto.metadata || {},
  };

  // Remove undefined values
  Object.keys(data).forEach(
    (key) => data[key] === undefined && delete data[key],
  );

  return data;
}

function mapIdentification(dto: TowerDTO) {
  return {
    id: dto.id || undefined,
    projectId: dto.projectId || dto.project_id || undefined,
    companyId: dto.companyId || dto.company_id || undefined,
    objectId: dto.objectId || dto.object_id || undefined,
    objectSeq: dto.objectSeq ?? dto.object_seq ?? undefined,
  };
}

function mapGeospatial(dto: TowerDTO) {
  return {
    xCoordinate: dto.xCoordinate ?? dto.x_coordinate ?? dto.x_cord_object ?? undefined,
    yCoordinate: dto.yCoordinate ?? dto.y_coordinate ?? dto.y_cord_object ?? undefined,
    objectElevation: dto.objectElevation ?? dto.object_elevation ?? undefined,
    fusoObject: dto.fusoObject || dto.fuso_object || undefined,
  };
}

function mapTechnicalSpecs(dto: TowerDTO) {
  return {
    towerType: dto.towerType || dto.tower_type || undefined,
    objectHeight: dto.objectHeight ?? dto.object_height ?? undefined,
    deflection: dto.deflection || undefined,
    goForward: dto.goForward ?? dto.go_forward ?? undefined,
    trecho: dto.trecho || undefined,
    tipoFundacao: dto.tipoFundacao || dto.tipo_fundacao || undefined,
    tipificacaoEstrutura: dto.tipificacaoEstrutura || dto.tipificacao_estrutura || undefined,
  };
}

function mapLegacyAndNewFields(dto: TowerDTO) {
  return {
    fixConductor: String(dto.fixConductor ?? dto.fix_conductor ?? ""),
    totalConcreto: dto.totalConcreto ?? dto.total_concreto ?? undefined,
    pesoArmacao: dto.pesoArmacao ?? dto.peso_armacao ?? undefined,
    pesoEstrutura: dto.pesoEstrutura ?? dto.peso_estrutura ?? undefined,
    tramoLancamento: dto.tramoLancamento || dto.tramo_lancamento || undefined,
    isHidden: dto.isHidden ?? dto.is_hidden ?? undefined,
    distance: dto.distance ?? undefined,
    weight: dto.weight ?? undefined,
    technicalKm: dto.technicalKm ?? dto.technical_km ?? undefined,
    technicalIndex: dto.technicalIndex ?? dto.technical_index ?? undefined,
    circuitId: dto.circuitId || dto.circuit_id || undefined,
  };
}
