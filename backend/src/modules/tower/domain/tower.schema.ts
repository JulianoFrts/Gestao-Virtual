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
  const data: unknown = {
    id: dto.id || undefined,
    projectId: dto.projectId || dto.project_id || undefined,
    companyId: dto.companyId || dto.company_id || undefined,
    objectId: dto.objectId || dto.object_id || undefined,
    objectSeq:
      dto.objectSeq !== undefined && dto.objectSeq !== null
        ? dto.objectSeq
        : dto.object_seq !== null
          ? dto.object_seq
          : undefined,
    towerType: dto.towerType || dto.tower_type || undefined,
    objectHeight:
      dto.objectHeight !== undefined && dto.objectHeight !== null
        ? dto.objectHeight
        : dto.object_height !== null
          ? dto.object_height
          : undefined,
    objectElevation:
      dto.objectElevation !== undefined && dto.objectElevation !== null
        ? dto.objectElevation
        : dto.object_elevation !== null
          ? dto.object_elevation
          : undefined,
    xCoordinate:
      dto.xCoordinate !== undefined && dto.xCoordinate !== null
        ? dto.xCoordinate
        : dto.x_coordinate !== undefined && dto.x_coordinate !== null
          ? dto.x_coordinate
          : dto.x_cord_object !== null
            ? dto.x_cord_object
            : undefined,
    yCoordinate:
      dto.yCoordinate !== undefined && dto.yCoordinate !== null
        ? dto.yCoordinate
        : dto.y_coordinate !== undefined && dto.y_coordinate !== null
          ? dto.y_coordinate
          : dto.y_cord_object !== null
            ? dto.y_cord_object
            : undefined,
    deflection: dto.deflection || undefined,
    goForward:
      dto.goForward !== undefined && dto.goForward !== null
        ? dto.goForward
        : dto.go_forward !== null
          ? dto.go_forward
          : undefined,
    fusoObject: dto.fusoObject || dto.fuso_object || undefined,
    fixConductor: String(
      dto.fixConductor !== undefined && dto.fixConductor !== null
        ? dto.fixConductor
        : dto.fix_conductor !== undefined && dto.fix_conductor !== null
          ? dto.fix_conductor
          : "",
    ),
    trecho: dto.trecho || undefined,
    totalConcreto:
      dto.totalConcreto !== undefined && dto.totalConcreto !== null
        ? dto.totalConcreto
        : dto.total_concreto !== undefined
          ? dto.total_concreto
          : undefined,
    pesoArmacao:
      dto.pesoArmacao !== undefined && dto.pesoArmacao !== null
        ? dto.pesoArmacao
        : dto.peso_armacao !== undefined
          ? dto.peso_armacao
          : undefined,
    pesoEstrutura:
      dto.pesoEstrutura !== undefined && dto.pesoEstrutura !== null
        ? dto.pesoEstrutura
        : dto.peso_estrutura !== undefined
          ? dto.peso_estrutura
          : undefined,
    tramoLancamento: dto.tramoLancamento || dto.tramo_lancamento || undefined,
    tipificacaoEstrutura:
      dto.tipificacaoEstrutura || dto.tipificacao_estrutura || undefined,
    tipoFundacao: dto.tipoFundacao || dto.tipo_fundacao || undefined,
    // Map New Fields
    isHidden:
      dto.isHidden !== undefined
        ? dto.isHidden
        : dto.is_hidden !== undefined
          ? dto.is_hidden
          : undefined,
    distance:
      dto.distance !== undefined && dto.distance !== null
        ? dto.distance
        : undefined,
    weight:
      dto.weight !== undefined && dto.weight !== null ? dto.weight : undefined,
    technicalKm:
      dto.technicalKm !== undefined
        ? dto.technicalKm
        : dto.technical_km !== undefined
          ? dto.technical_km
          : undefined,
    technicalIndex:
      dto.technicalIndex !== undefined
        ? dto.technicalIndex
        : dto.technical_index !== undefined
          ? dto.technical_index
          : undefined,
    circuitId: dto.circuitId || dto.circuit_id || undefined,

    metadata: dto.metadata || {},
  };

  // Remove undefined values
  Object.keys(data).forEach(
    (key) => data[key] === undefined && delete data[key],
  );

  return data;
}
