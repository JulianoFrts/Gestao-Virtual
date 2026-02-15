/**
 * API Services - Main Index
 * 
 * Ponto de entrada centralizado para todos os services de API.
 * 
 * @example
 * ```typescript
 * import { userService, authService, projectService } from '@/services/api';
 * 
 * // Autenticação
 * const loginResult = await authService.login({ email, password });
 * 
 * // CRUD de usuários
 * const users = await userService.getAll();
 * const user = await userService.getById(id);
 * 
 * // Operações de projeto
 * const projects = await projectService.getByCompany(companyId);
 * ```
 */

// Base Service
export * from './BaseApiService';

// Auth Services
export * from './auth';

// Core Services
export * from './core';

// Project Services
export * from './project';

// Monitoring Services
export * from './monitoring';

// Re-export specific instances for convenience
export { authService } from './auth/AuthService';
export { userService } from './core/UserService';
export { companyService } from './core/CompanyService';
export { jobFunctionService } from './core/JobFunctionService';
export { projectService } from './project/ProjectService';
export { siteService } from './project/SiteService';
export { teamService } from './project/TeamService';
export { dailyReportService } from './project/DailyReportService';
export { timeRecordService } from './monitoring/TimeRecordService';
export { systemMessageService } from './monitoring/SystemMessageService';
export { auditLogService } from './monitoring/AuditLogService';
