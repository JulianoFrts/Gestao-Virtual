export interface Project {
    id: string;
    name: string;
    description?: string | null;
    companyId: string;
    startDate?: Date | null;
    endDate?: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
