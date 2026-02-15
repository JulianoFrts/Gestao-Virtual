/**
 * Models - Backend Integration Layer
 * 
 * This folder contains all TypeScript interfaces that mirror the Prisma schema
 * from the ORION Backend. These models are used throughout the frontend to ensure
 * type safety when communicating with the API.
 * 
 * Structure:
 * - /auth       - Authentication models (Account, Session, UserRole)
 * - /core       - Core entities (User, Company, JobFunction)
 * - /project    - Project-related models (Project, Site, Team, Documents)
 * - /monitoring - Monitoring models (TimeRecord, SystemMessage, AuditLog)
 * - enums.ts    - Shared enums (Role, AccountStatus)
 * - schemas.ts  - Zod validation schemas for all entities
 * 
 * Usage:
 * ```typescript
 * // Import types from schemas (preferred - includes validation)
 * import { 
 *   CreateUserSchema, 
 *   UserLoginSchema,
 *   type User,
 *   type CreateUser 
 * } from '@/models/schemas';
 * 
 * // Import basic interfaces from submodules
 * import { User } from '@/models/core';
 * import { Project, Team } from '@/models/project';
 * ```
 */

// Zod Schemas (primary source - includes validation + type inference)
export * from './schemas';

// Auth Models (additional interfaces not in schemas)
export type { Account } from './auth/Account';
export type { Session } from './auth/Session';
export type { UserRole as UserRoleModel } from './auth/UserRole';

// Core Models (additional interfaces not in schemas)  
export type { User as UserModel, CreateUserDTO, UpdateUserDTO } from './core/User';

// Project Models (additional interfaces not in schemas)
export type { ConstructionDocument } from './project/ConstructionDocument';
export type { StageProgress } from './project/StageProgress';

// Note: Most types are now exported from './schemas' with Zod validation
// Use schemas types for runtime validation: CreateUserSchema.parse(data)
