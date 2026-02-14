import { Role } from '../enums';

export interface UserRole {
    id: string;
    userId: string;
    role: Role;
    permissions?: string[];
    createdAt: Date;
    updatedAt: Date;
}
