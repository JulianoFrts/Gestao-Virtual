export interface RoleStyle {
    bg: string;
    text: string;
    border: string;
    glow: string;
}

export const getRoleStyle = (role: string): string => {
    const r = (role || '').toUpperCase();

    if (r === 'HELPER_SYSTEM') return "bg-indigo-500/10 text-indigo-500 border-indigo-500/10 shadow-none font-mono tracking-widest";
    if (r === 'ADMIN') return "bg-rose-500/10 text-rose-500 border-rose-500/10 shadow-[0_0_10px_-4px_rgba(244,63,94,0.4)] font-black";
    if (r === 'TI_SOFTWARE') return "bg-emerald-500/10 text-emerald-500 border-emerald-500/10 shadow-[0_0_10px_-4px_rgba(16,185,129,0.4)] font-bold";
    if (r === 'COMPANY_ADMIN') return "bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-none font-bold";
    if (r === 'PROJECT_MANAGER') return "bg-blue-500/10 text-blue-500 border-blue-500/10 shadow-none";
    if (r === 'SITE_MANAGER') return "bg-cyan-500/10 text-cyan-500 border-cyan-500/10 shadow-none";
    if (r === 'SUPERVISOR') return "bg-teal-500/10 text-teal-500 border-teal-500/10 shadow-none";
    if (r === 'OPERATIONAL') return "bg-slate-500/10 text-slate-500 border-slate-500/10 shadow-none";
    if (r === 'VIEWER') return "bg-zinc-500/10 text-zinc-500 border-zinc-500/10 shadow-none italic";

    // Fallbacks para compatibilidade temporária
    if (r.includes('SUPER_ADMIN_GOD')) return "bg-rose-500/10 text-rose-500 border-rose-500/10 font-black";
    if (r.includes('SOCIO_DIRETOR') || r.includes('MODERATOR')) return "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold";

    return "bg-slate-500/5 text-slate-400 border-slate-500/10 shadow-none";
};

export const formatRoleName = (role: string): string => {
    if (!role) return '';
    return role
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export const getRoleLabel = (role: string): string => {
    const r = (role || '').toUpperCase();
    if (r === 'HELPER_SYSTEM') return 'Suporte Especializado';
    if (r === 'ADMIN') return 'Administrador Global';
    if (r === 'TI_SOFTWARE') return 'Gestão de Software';
    if (r === 'COMPANY_ADMIN') return 'Diretor(a)';
    if (r === 'PROJECT_MANAGER') return 'Project Manager';
    if (r === 'SITE_MANAGER') return 'Site Manager';
    if (r === 'SUPERVISOR') return 'Supervisor';
    if (r === 'OPERATIONAL') return 'Líder de Equipe';
    if (r === 'VIEWER') return 'Visualizador';
    
    // Labels legados
    if (r === 'SUPER_ADMIN_GOD') return 'Admin (Legado)';
    if (r === 'SOCIO_DIRETOR') return 'Diretor (Legado)';
    
    return formatRoleName(role);
};

export const STANDARD_ROLES = [
    { name: 'HELPER_SYSTEM', rank: 2000 },
    { name: 'ADMIN', rank: 1500 },
    { name: 'TI_SOFTWARE', rank: 1200 },
    { name: 'COMPANY_ADMIN', rank: 1000 },
    { name: 'PROJECT_MANAGER', rank: 800 },
    { name: 'SITE_MANAGER', rank: 700 },
    { name: 'SUPERVISOR', rank: 600 },
    { name: 'OPERATIONAL', rank: 100 },
    { name: 'VIEWER', rank: 50 },
];

export const STANDARD_MODULES = [
    { code: 'dashboard', name: 'Painel Geral', category: 'Geral' },
    { code: 'clock', name: 'Bate-ponto (Câmera)', category: 'Ponto Eletrônico' },
    { code: 'clock.manual_id', name: 'Ponto via Matrícula', category: 'Ponto Eletrônico' },
    { code: 'daily_report.create', name: 'Preencher RDO', category: 'Ponto Eletrônico' },
    { code: 'daily_report.list', name: 'Histórico de RDOs', category: 'Ponto Eletrônico' },
    { code: 'time_records.view', name: 'Visualizar Registros', category: 'Ponto Eletrônico' },
    { code: 'sites.view', name: 'Visualizar Canteiros', category: 'Corporativo' },
    { code: 'projects.view', name: 'Visualizar Obras', category: 'Corporativo' },
    { code: 'projects.manage', name: 'Gerenciar Obras', category: 'Corporativo' },
    { code: 'projects.progress', name: 'Andamento de Projetos (Mapa)', category: 'Graficos' },
    { code: 'work_progress.view', name: 'Andamento da Obra (Graficos)', category: 'Graficos' },
    { code: 'companies.view', name: 'Visualizar Empresas', category: 'Corporativo' },
    { code: 'companies.manage', name: 'Gerenciar Empresas', category: 'Corporativo' },
    { code: 'team_composition', name: 'Composição de Equipe', category: 'Equipes' },
    { code: 'employees.manage', name: 'Gestão de Funcionários', category: 'Equipes' },
    { code: 'functions.manage', name: 'Gestão de Funções', category: 'Equipes' },
    { code: 'gapo.view', name: 'Módulo GAPO', category: 'Controle Avançado' },
    { code: 'costs.view', name: 'Gestão de Custos', category: 'Produção' },
    { code: 'production.planning', name: 'Planejamento de Produção', category: 'Produção' },
    { code: 'production.analytics', name: 'Analytics de Produção', category: 'Produção' },
    { code: 'viewer_3d.view', name: 'Visualizador 3D', category: 'Ferramentas' },
    { code: 'users.manage', name: 'Gestão de Usuários', category: 'Administração' },
    { code: 'custom_su.manage', name: 'Configurar Matriz SU', category: 'Administração' },
    { code: 'audit_logs.view', name: 'Logs de Auditoria', category: 'Administração' },
    { code: 'db_hub.manage', name: 'Database Hub', category: 'Administração' },
    { code: 'data_ingestion', name: 'Ingestão de Dados', category: 'Administração' },
    { code: 'settings.profile', name: 'Editar Perfil', category: 'Configurações' },
    { code: 'settings.mfa', name: 'Gerenciar MFA', category: 'Configurações' },
    { code: 'support.ticket', name: 'Chamados de Suporte', category: 'Suporte' },
    { code: 'messages.view', name: 'Mensagens Corporativas', category: 'Geral' },
    { code: 'geo_viewer.view', name: 'Visualizador Geográfico', category: 'Ferramentas' },
];
