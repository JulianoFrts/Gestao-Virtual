import { Role, AccountStatus } from '../enums';

/**
 * User Model
 * 
 * Represents a user in the system, combining authentication (NextAuth)
 * with employee profile data from the ORION Backend.
 * 
 * @see Prisma schema: model User
 */
export interface User {
    id: string;
    email: string;
    name: string | null;
    password?: string | null;
    emailVerified: Date | null;
    image: string | null;
    role: Role;
    status: AccountStatus;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;

    // Profile Fields (Employee inheritance)
    companyId: string | null;
    registrationNumber: string | null;
    cpf: string | null;
    phone: string | null;
    functionId: string | null;
    projectId: string | null;
    siteId: string | null;
    faceDescriptor: unknown | null; // Represents Json in Prisma
    hierarchyLevel: number;

    // Relations (optional - loaded on demand)
    company?: { id: string; name: string };
    jobFunction?: { id: string; name: string };
    project?: { id: string; name: string };
    site?: { id: string; name: string };

    supervisedTeams?: Array<{ id: string; name: string }>;
    teamMemberships?: Array<{ id: string; teamId: string }>;
    createdDocuments?: Array<{ id: string; title: string }>;
    stageProgressUpdates?: Array<{ id: string; percentage: number }>;
    timeRecords?: Array<{ id: string; timestamp: Date; type: string }>;
    timeRecordsCreated?: Array<{ id: string; timestamp: Date }>;
    dailyReports?: Array<{ id: string; date: Date }>;
    receivedMessages?: Array<{ id: string; title: string; read: boolean }>;
    auditLogs?: Array<{ id: string; action: string; createdAt: Date }>;
    userRole?: { id: string; role: Role; permissions?: string[] };

    // NextAuth Relations
    accounts?: Array<{ id: string; provider: string }>;
    sessions?: Array<{ id: string; expires: Date }>;
}

/**
 * CreateUserDTO - Data Transfer Object for creating a new user
 */
export interface CreateUserDTO {
    email: string;
    name?: string;
    password?: string;
    role?: Role;
    companyId?: string;
    phone?: string;
    cpf?: string;
    functionId?: string;
    projectId?: string;
    siteId?: string;
}

/**
 * UpdateUserDTO - Data Transfer Object for updating a user
 */
export interface UpdateUserDTO {
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
    role?: Role;
    status?: AccountStatus;
    companyId?: string;
    functionId?: string;
    projectId?: string;
    siteId?: string;
    hierarchyLevel?: number;
}

/**
 * UserListItem - Lightweight user for lists
 */
export interface UserListItem {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    status: AccountStatus;
    image: string | null;
    companyId: string | null;
    createdAt: Date;
}
