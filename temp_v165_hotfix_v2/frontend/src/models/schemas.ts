/**
 * Zod Validation Schemas
 * 
 * Schemas de validação para todas as entidades do sistema.
 * Usados para validar dados antes de enviar ao backend.
 */

import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================

export const RoleSchema = z.enum([
    'USER',
    'ADMIN',
    'SUPERVISOR',
    'WORKER',
    'COORDINATOR',
    'MANAGER',
    'TI_SOFTWARE',
    'GESTOR_PROJETO',
    'GESTOR_CANTEIRO'
]);

export const AccountStatusSchema = z.enum([
    'PENDING_VERIFICATION',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'BLOCKED'
]);

// ============================================================
// USER SCHEMAS
// ============================================================

export const UserBaseSchema = z.object({
    id: z.string().cuid().optional(),
    email: z.string().email('Email inválido'),
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').nullable().optional(),
    phone: z.string().nullable().optional(),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').nullable().optional(),
    image: z.string().url().nullable().optional(),
    role: RoleSchema.optional().default('USER'),
    status: AccountStatusSchema.optional().default('PENDING_VERIFICATION'),
    companyId: z.string().cuid().nullable().optional(),
    projectId: z.string().cuid().nullable().optional(),
    siteId: z.string().cuid().nullable().optional(),
    functionId: z.string().cuid().nullable().optional(),
    registrationNumber: z.string().nullable().optional(),
    hierarchyLevel: z.number().int().min(0).max(100).default(0)
});

export const CreateUserSchema = UserBaseSchema.extend({
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
}).omit({ id: true, status: true });

export const UpdateUserSchema = UserBaseSchema.partial().omit({ id: true });

export const UserLoginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória')
});

export const UserListItemSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    role: z.string(),
    status: z.string(),
    image: z.string().nullable(),
    companyId: z.string().nullable(),
    createdAt: z.coerce.date()
});

// ============================================================
// COMPANY SCHEMAS
// ============================================================

export const CompanySchema = z.object({
    id: z.string().cuid().optional(),
    name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
    cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos').nullable().optional(),
    taxId: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});

export const CreateCompanySchema = CompanySchema.omit({ id: true, createdAt: true, updatedAt: true });
export const UpdateCompanySchema = CreateCompanySchema.partial();

// ============================================================
// JOB FUNCTION SCHEMAS
// ============================================================

export const JobFunctionSchema = z.object({
    id: z.string().cuid().optional(),
    name: z.string().min(2, 'Nome da função deve ter pelo menos 2 caracteres'),
    description: z.string().nullable().optional(),
    canLeadTeam: z.boolean().default(false),
    hierarchyLevel: z.number().int().min(0).max(100).default(0),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});

export const CreateJobFunctionSchema = JobFunctionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const UpdateJobFunctionSchema = CreateJobFunctionSchema.partial();

// ============================================================
// PROJECT SCHEMAS
// ============================================================

export const ProjectSchema = z.object({
    id: z.string().cuid().optional(),
    name: z.string().min(2, 'Nome do projeto deve ter pelo menos 2 caracteres'),
    description: z.string().nullable().optional(),
    companyId: z.string().cuid(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});

export const CreateProjectSchema = ProjectSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const UpdateProjectSchema = CreateProjectSchema.partial();

// ============================================================
// SITE SCHEMAS
// ============================================================

export const SiteSchema = z.object({
    id: z.string().cuid().optional(),
    name: z.string().min(2, 'Nome do canteiro deve ter pelo menos 2 caracteres'),
    projectId: z.string().cuid(),
    address: z.string().nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});

export const CreateSiteSchema = SiteSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const UpdateSiteSchema = CreateSiteSchema.partial();

// ============================================================
// TEAM SCHEMAS
// ============================================================

export const TeamSchema = z.object({
    id: z.string().cuid().optional(),
    name: z.string().min(2, 'Nome da equipe deve ter pelo menos 2 caracteres'),
    supervisorId: z.string().cuid(),
    projectId: z.string().cuid().nullable().optional(),
    siteId: z.string().cuid().nullable().optional(),
    active: z.boolean().default(true),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});

export const CreateTeamSchema = TeamSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const UpdateTeamSchema = CreateTeamSchema.partial();

export const TeamMemberSchema = z.object({
    id: z.string().cuid().optional(),
    teamId: z.string().cuid(),
    userId: z.string().cuid(),
    role: z.string().nullable().optional(),
    joinedAt: z.coerce.date().optional()
});

// ============================================================
// TIME RECORD SCHEMAS
// ============================================================

export const TimeRecordSchema = z.object({
    id: z.string().cuid().optional(),
    userId: z.string().cuid(),
    type: z.enum(['entry', 'exit', 'ENTRY', 'EXIT']),
    timestamp: z.coerce.date(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    photoUrl: z.string().url().nullable().optional(),
    createdById: z.string().cuid().nullable().optional(),
    createdAt: z.coerce.date().optional()
});

export const CreateTimeRecordSchema = TimeRecordSchema.omit({ id: true, createdAt: true });

// ============================================================
// DAILY REPORT SCHEMAS
// ============================================================

export const DailyReportSchema = z.object({
  id: z.string().cuid().optional(),
  date: z.coerce.date(),
  content: z.string().min(1, "Conteúdo do relatório é obrigatório"),
  teamId: z.string().cuid().nullable().optional(),
  teamIds: z.array(z.string().cuid()).optional(), // Soporte multi-equipe
  subPoint: z.string().nullable().optional(),
  subPointType: z
    .enum(["TORRE", "VAO", "TRECHO", "GERAL"])
    .nullable()
    .optional(),
  projectId: z.string().cuid().nullable().optional(),
  createdById: z.string().cuid(),
  activities: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  metadata: z.any().optional(),
  createdAt: z.coerce.date().optional(),
});

export const CreateDailyReportSchema = DailyReportSchema.omit({ id: true, createdAt: true });

// ============================================================
// SYSTEM MESSAGE SCHEMAS
// ============================================================

export const SystemMessageSchema = z.object({
    id: z.string().cuid().optional(),
    recipientId: z.string().cuid(),
    title: z.string().min(1, 'Título é obrigatório'),
    content: z.string().min(1, 'Conteúdo é obrigatório'),
    type: z.enum(['info', 'warning', 'alert', 'success']).default('info'),
    read: z.boolean().default(false),
    createdAt: z.coerce.date().optional()
});

export const CreateSystemMessageSchema = SystemMessageSchema.omit({ id: true, createdAt: true, read: true });

// ============================================================
// AUDIT LOG SCHEMAS
// ============================================================

export const AuditLogSchema = z.object({
    id: z.string().cuid().optional(),
    userId: z.string().cuid(),
    action: z.string().min(1, 'Ação é obrigatória'),
    entity: z.string().min(1, 'Entidade é obrigatória'),
    entityId: z.string(),
    details: z.any().nullable().optional(),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    createdAt: z.coerce.date().optional()
});

// ============================================================
// TYPE EXPORTS (Inferred from Zod schemas)
// ============================================================

export type Role = z.infer<typeof RoleSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
export type UserBase = z.infer<typeof UserBaseSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type UserListItem = z.infer<typeof UserListItemSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type CreateCompany = z.infer<typeof CreateCompanySchema>;
export type UpdateCompany = z.infer<typeof UpdateCompanySchema>;
export type JobFunction = z.infer<typeof JobFunctionSchema>;
export type CreateJobFunction = z.infer<typeof CreateJobFunctionSchema>;
export type UpdateJobFunction = z.infer<typeof UpdateJobFunctionSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type CreateSite = z.infer<typeof CreateSiteSchema>;
export type UpdateSite = z.infer<typeof UpdateSiteSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type CreateTeam = z.infer<typeof CreateTeamSchema>;
export type UpdateTeam = z.infer<typeof UpdateTeamSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type TimeRecord = z.infer<typeof TimeRecordSchema>;
export type CreateTimeRecord = z.infer<typeof CreateTimeRecordSchema>;
export type DailyReport = z.infer<typeof DailyReportSchema>;
export type CreateDailyReport = z.infer<typeof CreateDailyReportSchema>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type CreateSystemMessage = z.infer<typeof CreateSystemMessageSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
