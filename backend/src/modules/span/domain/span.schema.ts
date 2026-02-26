import { z } from "zod";

export const spanSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().optional(),
  project_id: z.string().optional(),
  companyId: z.string().optional(),
  company_id: z.string().optional(),
  spanName: z.string().optional(),
  span_name: z.string().optional(),
  towerStartId: z.string().optional(),
  tower_start_id: z.string().optional(),
  towerEndId: z.string().optional(),
  tower_end_id: z.string().optional(),
  spanLength: z.number().optional(),
  voltageKv: z.number().optional(),
  voltage_kv: z.number().optional(),
  cableType: z.string().optional(),
  cable_type: z.string().optional(),
  catenaryConstant: z.number().optional(),
  catenary_constant: z.number().optional(),
  cablePhases: z.number().optional(),
  cable_phases: z.number().optional(),
  cableSpacing: z.number().optional(),
  cable_spacing: z.number().optional(),
  heightStart: z.number().optional(),
  height_start: z.number().optional(),
  heightEnd: z.number().optional(),
  height_end: z.number().optional(),
  cableColor: z.string().optional(),
  cable_color: z.string().optional(),
  geometry: z.any().optional(),
  geometryData: z.any().optional(),
  geometry_data: z.any().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SpanDTO = z.infer<typeof spanSchema>;

export function mapDtoToEntity(dto: SpanDTO): any {
  const data: unknown = {
    id: dto.id,
    projectId: dto.projectId || dto.project_id,
    companyId: dto.companyId || dto.company_id,
    spanName: dto.spanName || dto.span_name,
    towerStartId: dto.towerStartId || dto.tower_start_id,
    towerEndId: dto.towerEndId || dto.tower_end_id,
    voltageKv: dto.voltageKv || dto.voltage_kv,
    cableType: dto.cableType || dto.cable_type,
    catenaryConstant: dto.catenaryConstant || dto.catenary_constant,
    cablePhases:
      dto.cablePhases !== undefined ? dto.cablePhases : dto.cable_phases,
    cableSpacing:
      dto.cableSpacing !== undefined ? dto.cableSpacing : dto.cable_spacing,
    heightStart:
      dto.heightStart !== undefined ? dto.heightStart : dto.height_start,
    heightEnd: dto.heightEnd !== undefined ? dto.heightEnd : dto.height_end,
    cableColor: dto.cableColor || dto.cable_color,
    geometryData: dto.geometry || dto.geometryData || dto.geometry_data || {},
    metadata: dto.metadata || {},
  };

  // Remove undefined values
  Object.keys(data).forEach(
    (key) => data[key] === undefined && delete data[key],
  );

  return data;
}
