/**
 * Schemas de Validação para Rotas da API — GESTÃO VIRTUAL
 *
 * Schemas Zod organizados por domínio para validação de body em rotas
 * que anteriormente não possuíam validação de input.
 */

import { z } from "zod";
import { cuidSchema, emailSchema } from "./schemas";

// ======================================================
// RPC ROUTES
// ======================================================

/**
 * RPC: move_team_member
 */
export const moveTeamMemberSchema = z.object({
  p_employee_id: z.string().min(1, "ID do funcionário é obrigatório"),
  p_from_team_id: z.string().nullable().default(null),
  p_to_team_id: z.string().nullable().default(null),
});

/**
 * RPC: delete_user_safe
 */
export const deleteUserSafeSchema = z.object({
  userId: z.string().min(1, "ID do usuário é obrigatório"),
  confirmDelete: z.boolean().optional().default(false),
});

/**
 * RPC: admin_update_user_email
 */
export const adminUpdateEmailSchema = z.object({
  userId: z.string().min(1, "ID do usuário é obrigatório"),
  newEmail: emailSchema,
});

// ======================================================
// TEAMS
// ======================================================

export const createTeamSchema = z.object({
  name: z.string().min(1, "Nome da equipe é obrigatório").max(200),
  companyId: z.string().min(1, "ID da empresa é obrigatório"),
  siteId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  laborType: z.string().optional().default("OWN"),
});

export const updateTeamSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    siteId: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    laborType: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Pelo menos um campo deve ser fornecido",
  });

export const moveTeamMemberDirectSchema = z.object({
  userId: z.string().min(1, "ID do funcionário é obrigatório"),
  fromTeamId: z.string().optional().nullable(),
  toTeamId: z.string().min(1, "ID da equipe destino é obrigatório"),
});

// ======================================================
// PRODUCTION
// ======================================================

export const delayCostSchema = z.object({
  projectId: z.string().min(1, "ID do projeto é obrigatório"),
  towerId: z.string().optional(),
  activityId: z.string().optional(),
  reason: z.string().min(1, "Motivo é obrigatório").max(500),
  cost: z.number().min(0, "Custo deve ser positivo").optional(),
  date: z.string().optional(),
});

export const delayReasonSchema = z.object({
  name: z.string().min(1, "Nome do motivo é obrigatório").max(200),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const productionScheduleSchema = z.object({
  projectId: z.string().min(1, "ID do projeto é obrigatório"),
  activities: z
    .array(
      z.object({
        activityId: z.string().min(1),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .optional(),
});

// ======================================================
// DB CONSOLE
// ======================================================

export const dbQuerySchema = z.object({
  query: z.string().min(1, "A query SQL é obrigatória"),
});

export const dbDiagramSchema = z.object({
  name: z.string().min(1, "Nome do diagrama é obrigatório").max(200),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  metadata: z.record(z.unknown()).optional(),
});

// ======================================================
// PERMISSIONS
// ======================================================

export const permissionMatrixSyncSchema = z.object({
  roleId: z.string().min(1),
  permissions: z.record(z.boolean()),
});

// ======================================================
// GENERIC HELPERS
// ======================================================

export const idParamSchema = z.object({
  id: cuidSchema,
});

/** Tipo de schemas exportados para inferência */
export type MoveTeamMemberInput = z.infer<typeof moveTeamMemberSchema>;
export type DeleteUserSafeInput = z.infer<typeof deleteUserSafeSchema>;
export type AdminUpdateEmailInput = z.infer<typeof adminUpdateEmailSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type DelayCostInput = z.infer<typeof delayCostSchema>;
export type DelayReasonInput = z.infer<typeof delayReasonSchema>;
export type DbQueryInput = z.infer<typeof dbQuerySchema>;
