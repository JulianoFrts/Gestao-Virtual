

export interface RoleStyle {
    bg: string;
    text: string;
    border: string;
    glow: string;
}

export const getRoleStyle = (role: string): string => {
    const r = (role || '').toUpperCase();

    // Matched styles with CustomSU.tsx and Users.tsx
    if (r.includes('SUPER_ADMIN_GOD') || r.includes('SUPERADMINGOD')) return "bg-orange-500/10 text-orange-600 border-orange-500/20 shadow-[0_0_10px_-4px_rgba(249,115,22,0.4)] font-black";
    if (r.includes('SOCIO_DIRETOR')) return "bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-none font-bold";
    if (r.includes('HELPER_SYSTEM')) return "bg-indigo-500/10 text-indigo-500 border-indigo-500/10 shadow-none font-mono tracking-widest";
    if (r.includes('ADMIN') || r.includes('SUPERADMIN')) return "bg-rose-500/10 text-rose-500 border-rose-500/10 shadow-none font-semibold";
    if (r.includes('MANAGER') || r.includes('GERENTE')) return "bg-blue-500/10 text-blue-500 border-blue-500/10 shadow-none";
    if (r.includes('MODERATOR')) return "bg-violet-500/10 text-violet-500 border-violet-500/10 shadow-none";
    if (r.includes('TI_SOFTWARE')) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/10 shadow-[0_0_10px_-4px_rgba(16,185,129,0.4)]";
    if (r.includes('GESTOR_PROJECT')) return "bg-sky-500/10 text-sky-500 border-sky-500/10 shadow-none";
    if (r.includes('GESTOR_CANTEIRO')) return "bg-cyan-500/10 text-cyan-500 border-cyan-500/10 shadow-none";
    if (r.includes('SUPERVISOR')) return "bg-teal-500/10 text-teal-500 border-teal-500/10 shadow-none";
    if (r.includes('TECHNICIAN')) return "bg-lime-500/10 text-lime-500 border-lime-500/10 shadow-none";
    if (r.includes('OPERATOR')) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/10 shadow-none";
    if (r.includes('WORKER') || r.includes('TRABALHADOR')) return "bg-slate-500/10 text-slate-500 border-slate-500/10 shadow-none";
    if (r.includes('VIEWER') || r.includes('VISUALIZACAO')) return "bg-zinc-500/10 text-zinc-500 border-zinc-500/10 shadow-none italic";

    // Default / Worker / Viewer
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
    if (r === 'SUPER_ADMIN_GOD' || r === 'SUPERADMINGOD') return 'Super Admin God';
    if (r === 'SOCIO_DIRETOR') return 'Sócio Diretor';
    if (r === 'ADMIN' || r === 'ADMINISTRADOR' || r === 'SUPERADMIN') return 'Admin';
    if (r === 'MODERATOR') return 'Moderador';
    if (r === 'MANAGER' || r === 'GERENTE') return 'Gerente';
    if (r === 'TI_SOFTWARE') return 'Ti-Software';
    if (r === 'GESTOR_PROJECT') return 'Gestor de Obra';
    if (r === 'GESTOR_CANTEIRO') return 'Gestor de Canteiro';
    if (r === 'SUPERVISOR') return 'Supervisor';
    if (r === 'TECHNICIAN' || r === 'TECNICO') return 'Técnico';
    if (r === 'OPERATOR' || r === 'OPERADOR') return 'Operador';
    if (r === 'WORKER' || r === 'TRABALHADOR') return 'Trabalhador';
    if (r === 'VIEWER' || r === 'VISUALIZACAO') return 'Visualizador';
    return formatRoleName(role);
};

export const STANDARD_ROLES = [
    { name: 'HELPER_SYSTEM', rank: 2000 },
    { name: 'SUPER_ADMIN_GOD', rank: 1500 },
    { name: 'SOCIO_DIRETOR', rank: 1000 },
    { name: 'ADMIN', rank: 950 },
    { name: 'TI_SOFTWARE', rank: 900 },
    { name: 'MODERATOR', rank: 850 },
    { name: 'MANAGER', rank: 850 },
    { name: 'GESTOR_PROJECT', rank: 800 },
    { name: 'GESTOR_CANTEIRO', rank: 700 },
    { name: 'SUPERVISOR', rank: 600 },
    { name: 'TECHNICIAN', rank: 400 },
    { name: 'OPERATOR', rank: 300 },
    { name: 'WORKER', rank: 100 },
    { name: 'USER', rank: 100 },
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
