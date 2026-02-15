export enum Role {
    USER = 'Worker',
    ADMIN = 'Admin',
    SUPERVISOR = 'Supervisor',
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    WORKER = 'Worker',
    COORDINATOR = 'Coordinator',
    MANAGER = 'Manager',
    TI_SOFTWARE = 'TI_Software',
    GESTOR_PROJECT = 'Gestor_Project',
    GESTOR_CANTEIRO = 'Gestor_Canteiro',
    SUPERADMIN = 'SuperAdmin'
}

export enum AccountStatus {
    PENDING_VERIFICATION = 'PENDING_VERIFICATION',
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    BLOCKED = 'BLOCKED'
}
