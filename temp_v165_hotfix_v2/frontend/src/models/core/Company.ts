export interface Company {
    id: string;
    name: string;
    cnpj?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
