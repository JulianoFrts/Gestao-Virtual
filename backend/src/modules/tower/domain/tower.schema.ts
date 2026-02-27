import { z } from "zod";

/**
 * Identity Interface - Dados básicos de identificação
 */
export const towerIdentitySchema = z.object({
  id: z.string().uuid().optional().nullable(),
  projectId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  objectId: z.string().nonempty("ID da torre é obrigatório"),
  objectSeq: z.number().optional().nullable(),
  towerType: z.string().default("Autoportante"),
  trecho: z.string().optional().nullable(),
});

/**
 * Spatial/Geography Interface - Dados de localização e terreno
 */
export const towerGeographySchema = z.object({
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  elevation: z.number().optional().nullable(),
  deflection: z.string().optional().nullable(),
  goForward: z.number().optional().nullable(), // Vão vante
  fuso: z.string().optional().nullable(),
  technicalKm: z.number().optional().nullable(),
  technicalIndex: z.number().optional().nullable(),
});

/**
 * Structural/Technical Interface - Propriedades físicas e materiais
 */
export const towerStructuralSchema = z.object({
  height: z.number().optional().nullable(),
  concreteVolume: z.number().optional().nullable(),
  steelWeight: z.number().optional().nullable(),
  structureWeight: z.number().optional().nullable(),
  foundationType: z.string().optional().nullable(),
  fixConductor: z.string().optional().nullable(),
  circuitId: z.string().optional().nullable(),
});

/**
 * Governance/State Interface - Metadados e Controle
 */
export const towerGovernanceSchema = z.object({
  isHidden: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Unified Tower DTO (Composto via ISP)
 */
export const towerSchema = towerIdentitySchema
  .merge(towerGeographySchema)
  .merge(towerStructuralSchema)
  .merge(towerGovernanceSchema);

export type TowerDTO = z.infer<typeof towerSchema>;

/**
 * Mapeador de entrada (Legacy/External -> Domain)
 * Suporta snake_case e nomes alternativos para compatibilidade com importações.
 */
export function mapDtoToEntity(dto: any): any {
  // Normalização de campos legados ou snake_case
  const normalized: TowerDTO = {
    id: dto.id || undefined,
    projectId: dto.projectId || dto.project_id || undefined,
    companyId: dto.companyId || dto.company_id || undefined,
    objectId: String(dto.objectId || dto.object_id || dto.NumeroTorre || ""),
    objectSeq: Number(dto.objectSeq ?? dto.object_seq ?? dto.Sequencia ?? 0),
    towerType: dto.towerType || dto.tower_type || dto.Tipificacao || "Autoportante",
    trecho: dto.trecho || dto.Trecho || undefined,
    
    latitude: Number(dto.latitude ?? dto.x_coordinate ?? dto.xCoordinate ?? 0),
    longitude: Number(dto.longitude ?? dto.y_coordinate ?? dto.yCoordinate ?? 0),
    elevation: Number(dto.elevation ?? dto.object_elevation ?? dto.objectElevation ?? 0),
    deflection: dto.deflection || undefined,
    goForward: Number(dto.goForward ?? dto.go_forward ?? dto.VaoVante_m ?? 0),
    fuso: dto.fuso || dto.fuso_object || dto.fusoObject || undefined,
    technicalKm: Number(dto.technicalKm ?? dto.technical_km ?? 0),
    technicalIndex: Number(dto.technicalIndex ?? dto.technical_index ?? 0),

    height: Number(dto.height ?? dto.objectHeight ?? dto.object_height ?? 0),
    concreteVolume: Number(dto.concreteVolume ?? dto.total_concreto ?? dto.totalConcreto ?? dto.Concreto_m3 ?? 0),
    steelWeight: Number(dto.steelWeight ?? dto.peso_armacao ?? dto.pesoArmacao ?? dto.PesoArmacao_ton ?? 0),
    structureWeight: Number(dto.structureWeight ?? dto.peso_estrutura ?? dto.pesoEstrutura ?? dto.PesoEstrutura_ton ?? 0),
    foundationType: dto.foundationType || dto.tipo_fundacao || dto.tipoFundacao || undefined,
    fixConductor: String(dto.fixConductor ?? dto.fix_conductor ?? ""),
    circuitId: dto.circuitId || dto.circuit_id || undefined,

    isHidden: Boolean(dto.isHidden ?? dto.is_hidden ?? false),
    metadata: dto.metadata || {},
  };

  return normalized;
}
