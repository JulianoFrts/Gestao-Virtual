/**
 * Zod Validation Schemas - Backend-Oriented & Flexible
 * 
 * Schemas de validação para o frontend. Removido o acoplamento rígido (hardcoded)
 * para permitir que o backend dite a estrutura. O frontend agora atua como 
 * um validador permissivo.
 */

import { z } from 'zod';

// ============================================================
// HELPERS - Permissive Mapping
// ============================================================

// Aceita qualquer string como ID para suportar migrações (CUID, UUID, Serial, etc)
const IdSchema = z.string();

// Permite campos adicionais vindos do servidor sem quebrar o frontend
const BaseObject = z.object({}).passthrough();

// ============================================================
// ENUMS (Permissivos: Aceitam valores do backend e fazem fallback silencioso)
// ============================================================

export const RoleSchema = z.string().transform(val => val.toUpperCase()).catch('USER');

export const AccountStatusSchema = z.string().transform(val => val.toUpperCase()).catch('PENDING_VERIFICATION');

// ============================================================
// USER SCHEMAS
// ============================================================

export const UserBaseSchema = z.object({
    id: IdSchema.optional(),
    email: z.string().email().optional(),
    name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    cpf: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    role: RoleSchema.optional(),
    status: AccountStatusSchema.optional(),
    companyId: IdSchema.nullable().optional(),
    projectId: IdSchema.nullable().optional(),
    siteId: IdSchema.nullable().optional(),
    functionId: IdSchema.nullable().optional(),
    registrationNumber: z.string().nullable().optional(),
    hierarchyLevel: z.number().optional()
}).passthrough();

export const CreateUserSchema = UserBaseSchema.extend({
    password: z.string().min(1)
});

export const UpdateUserSchema = UserBaseSchema.partial();

export const UserLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

export const UserListItemSchema = z.object({
    id: IdSchema,
    email: z.string(),
    name: z.string().nullable(),
    role: z.string().optional(),
    status: z.string().optional(),
    image: z.string().nullable().optional(),
    companyId: IdSchema.nullable().optional(),
    createdAt: z.any() // Aceita Date ou String ISO
}).passthrough();

// ============================================================
// COMPANY SCHEMAS
// ============================================================

export const CompanySchema = z.object({
    id: IdSchema.optional(),
    name: z.string(),
    cnpj: z.string().nullable().optional(),
    taxId: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
}).passthrough();

export const CreateCompanySchema = CompanySchema.omit({ id: true });
export const UpdateCompanySchema = CompanySchema.partial();

// ============================================================
// JOB FUNCTION SCHEMAS
// ============================================================

export const JobFunctionSchema = z.object({
    id: IdSchema.optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    canLeadTeam: z.boolean().optional(),
    hierarchyLevel: z.number().optional()
}).passthrough();

// ============================================================
// PROJECT SCHEMAS
// ============================================================

export const ProjectSchema = z.object({
    id: IdSchema.optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    companyId: IdSchema.optional(),
    status: z.string().optional(),
}).passthrough();

export const CreateProjectSchema = ProjectSchema.omit({ id: true });
export const UpdateProjectSchema = ProjectSchema.partial();

// ============================================================
// SITE SCHEMAS
// ============================================================

export const SiteSchema = z.object({
    id: IdSchema.optional(),
    name: z.string(),
    projectId: IdSchema.optional(),
    address: z.string().nullable().optional(),
}).passthrough();

export const CreateSiteSchema = SiteSchema.omit({ id: true });
export const UpdateSiteSchema = SiteSchema.partial();

// ============================================================
// TEAM SCHEMAS
// ============================================================

export const TeamSchema = z.object({
    id: IdSchema.optional(),
    name: z.string(),
    supervisorId: IdSchema.nullable().optional(),
    projectId: IdSchema.nullable().optional(),
    siteId: IdSchema.nullable().optional(),
    active: z.boolean().optional(),
}).passthrough();

export const TeamMemberSchema = z.object({
    id: IdSchema.optional(),
    teamId: IdSchema,
    userId: IdSchema,
}).passthrough();

export const CreateTeamSchema = TeamSchema.omit({ id: true });
export const UpdateTeamSchema = TeamSchema.partial();

// ============================================================
// TIME RECORD SCHEMAS
// ============================================================

export const TimeRecordSchema = z.object({
    id: IdSchema.optional(),
    userId: IdSchema,
    type: z.string(),
    timestamp: z.string().or(z.date()),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    photoUrl: z.string().nullable().optional(),
}).passthrough();

// ============================================================
// DAILY REPORT SCHEMAS
// ============================================================

export const DailyReportSchema = z.object({
    id: IdSchema.optional(),
    date: z.string().or(z.date()),
    reportDate: z.string().or(z.date()).optional(),
    content: z.record(z.unknown()),
    activities: z.array(z.unknown()).optional(),
    teamId: IdSchema.nullable().optional(),
    teamIds: z.array(IdSchema).optional(),
    projectId: IdSchema.nullable().optional(),
    createdById: IdSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
}).passthrough();

export const CreateDailyReportSchema = DailyReportSchema.omit({ id: true });

// ============================================================
// SYSTEM MESSAGE SCHEMAS
// ============================================================

export const SystemMessageSchema = z.object({
    id: IdSchema.optional(),
    recipientId: IdSchema.optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    type: z.string().optional(),
    read: z.boolean().optional(),
}).passthrough();

// ============================================================
// AUDIT LOG SCHEMAS
// ============================================================

export const AuditLogSchema = z.object({
    id: IdSchema.optional(),
    userId: IdSchema.optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    entityId: z.string().optional(),
    details: z.record(z.unknown()).optional(),
}).passthrough();

// ============================================================
// TYPE EXPORTS (Inferred from Zod schemas)
// ============================================================

export type Role = string;
export type AccountStatus = string;
export type UserBase = z.infer<typeof UserBaseSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type UserListItem = z.infer<typeof UserListItemSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type CreateCompany = z.infer<typeof CreateCompanySchema>;
export type UpdateCompany = z.infer<typeof UpdateCompanySchema>;
export type JobFunction = z.infer<typeof JobFunctionSchema>;
export type CreateJobFunction = z.infer<typeof JobFunctionSchema>; // Alias permissivo
export type UpdateJobFunction = Partial<z.infer<typeof JobFunctionSchema>>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type CreateSite = z.infer<typeof SiteSchema>;
export type UpdateSite = Partial<z.infer<typeof SiteSchema>>;
export type Team = z.infer<typeof TeamSchema>;
export type CreateTeam = z.infer<typeof TeamSchema>;
export type UpdateTeam = Partial<z.infer<typeof TeamSchema>>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type TimeRecord = z.infer<typeof TimeRecordSchema>;
export type CreateTimeRecord = z.infer<typeof TimeRecordSchema>;
export type DailyReport = z.infer<typeof DailyReportSchema>;
export type CreateDailyReport = z.infer<typeof DailyReportSchema>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type CreateSystemMessage = z.infer<typeof SystemMessageSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
