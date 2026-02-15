export const PERMISSION_CATEGORIES = {
    OPERATIONAL: {
        label: "Operacional (Básico)",
        permissions: [
            { code: 'dashboard', label: 'Painel Geral' },
            { code: 'clock', label: 'Bate-ponto (Câmera)' },
            { code: 'clock.manual_id', label: 'Ponto via Matrícula' },
            { code: 'daily_reports', label: 'Relatórios Diários' },
            { code: 'time_records.view', label: 'Visualizar Registros de Ponto' },
            { code: 'settings.profile', label: 'Editar Perfil' },
            { code: 'support.ticket', label: 'Chamados de Suporte' },
        ]
    },
    MANAGEMENT: {
        label: "Gestão (Gerentes/Supervisores)",
        permissions: [
            { code: 'companies.view', label: 'Visualizar Empresas' },
            { code: 'companies.manage', label: 'Gerenciar Empresas' },
            { code: 'sites.view', label: 'Visualizar Canteiros' },
            { code: 'projects.view', label: 'Visualizar Obras' },
            { code: 'projects.manage', label: 'Gerenciar Obras' },
            { code: 'team_composition', label: 'Composição de Equipe' },
            { code: 'employees.manage', label: 'Gestão de Funcionários' },
            { code: 'viewer_3d.view', label: 'Visualizador 3D' },
            { code: 'projects.progress', label: 'Andamento de Projetos (Mapa)' },
            { code: 'work_progress.view', label: 'Andamento da Obra (Gráficos)' },
            { code: 'costs.view', label: 'Gestão de Custos' },
            { code: 'production.analytics', label: 'Analytics de Produção' },
        ]
    },
    GLOBAL: {
        label: "Gestão Global (Admin)",
        permissions: [
            { code: 'users.manage', label: 'Gestão de Usuários' },
            { code: 'custom_su.manage', label: 'Configurar Matriz SU' },
            { code: 'audit_logs.view', label: 'Logs de Auditoria' },
            { code: 'db_hub.manage', label: 'Database Hub' },
            { code: 'settings.mfa', label: 'Gerenciar MFA' },
            { code: 'gapo.view', label: 'Módulo GAPO' },
        ]
    }
};

export const ALL_PERMISSIONS = [
    ...PERMISSION_CATEGORIES.OPERATIONAL.permissions,
    ...PERMISSION_CATEGORIES.MANAGEMENT.permissions,
    ...PERMISSION_CATEGORIES.GLOBAL.permissions
];
