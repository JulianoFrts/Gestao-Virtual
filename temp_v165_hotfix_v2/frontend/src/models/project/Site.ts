export interface Site {
    id: string;
    name: string;
    projectId: string;
    address?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
