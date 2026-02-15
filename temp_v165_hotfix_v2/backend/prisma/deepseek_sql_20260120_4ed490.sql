-- ============================================
-- SCHEMA PARA SISTEMA DE CONSTRUÇÃO CIVIL
-- Versão: 1.0.0
-- Data: 2024-01-20
-- ============================================

-- ============================================
-- 1. TABELAS DE CONFIGURAÇÃO E CADASTRO BASE
-- ============================================

-- Empresas/clientes do sistema
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(20) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE companies IS 'Empresas/clientes que utilizam o sistema';
COMMENT ON COLUMN companies.tax_id IS 'CNPJ ou CPF da empresa';

-- Funções/cargos dos funcionários
CREATE TABLE job_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    can_lead_team BOOLEAN DEFAULT FALSE,
    hierarchy_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

COMMENT ON TABLE job_functions IS 'Funções/cargos dos funcionários';

-- ============================================
-- 2. TABELAS DE PROJETOS E OBRAS
-- ============================================

-- Projetos principais
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    planned_hours DECIMAL(10,2) DEFAULT 0,
    estimated_cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

COMMENT ON TABLE projects IS 'Projetos de construção';
COMMENT ON COLUMN projects.planned_hours IS 'Horas-homem planejadas (HHH)';

-- Sites/locais de trabalho dentro do projeto
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    location_details TEXT,
    planned_hours DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, code)
);

COMMENT ON TABLE sites IS 'Locais/obras específicas dentro do projeto';

-- ============================================
-- 3. TABELAS DE USUÁRIOS E PERMISSÕES
-- ============================================

-- Níveis de permissão do sistema
CREATE TABLE permission_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    rank INTEGER NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE permission_levels IS 'Níveis hierárquicos de permissão';

-- Módulos do sistema
CREATE TABLE permission_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE permission_modules IS 'Módulos/funcionalidades do sistema';

-- Matriz de permissões (nível x módulo)
CREATE TABLE permission_matrix (
    level_id UUID NOT NULL REFERENCES permission_levels(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES permission_modules(id) ON DELETE CASCADE,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (level_id, module_id)
);

COMMENT ON TABLE permission_matrix IS 'Permissões por nível e módulo';

-- ============================================
-- 4. TABELAS DE FUNCIONÁRIOS E EQUIPES
-- ============================================

-- Funcionários
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID UNIQUE, -- Referência opcional ao sistema de autenticação
    registration_number VARCHAR(50) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    function_id UUID REFERENCES job_functions(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    photo_url TEXT,
    face_descriptor JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    hierarchy_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, registration_number)
);

COMMENT ON TABLE employees IS 'Funcionários das empresas';
COMMENT ON COLUMN employees.user_id IS 'Link com usuário do sistema de autenticação';
COMMENT ON COLUMN employees.face_descriptor IS 'Dados de reconhecimento facial';

-- Equipes de trabalho
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE teams IS 'Equipes de trabalho';

-- Membros das equipes
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, employee_id)
);

COMMENT ON TABLE team_members IS 'Membros das equipes';

-- ============================================
-- 5. TABELAS DE DOCUMENTAÇÃO TÉCNICA
-- ============================================

-- Documentos de construção
CREATE TABLE construction_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    version INTEGER DEFAULT 1,
    file_url TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    folder_path TEXT DEFAULT '/',
    status VARCHAR(50) DEFAULT 'valid',
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE construction_documents IS 'Documentos técnicos da obra';

-- Elementos de mapa (2D/3D)
CREATE TABLE map_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID REFERENCES construction_documents(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    element_type VARCHAR(100) NOT NULL,
    coordinates JSONB NOT NULL,
    path JSONB,
    description TEXT,
    extended_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE map_elements IS 'Elementos geográficos/mapas';

-- Configurações de visualização por usuário
CREATE TABLE map_element_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES construction_documents(id) ON DELETE CASCADE,
    element_id VARCHAR(100) NOT NULL,
    element_name VARCHAR(255),
    is_hidden BOOLEAN DEFAULT FALSE,
    element_color VARCHAR(50),
    element_height DECIMAL(10,2),
    element_elevation DECIMAL(10,2),
    element_angle DECIMAL(5,2),
    custom_model_url TEXT,
    custom_model_transform JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE map_element_visibility IS 'Configurações de visualização 3D por usuário';

-- ============================================
-- 6. TABELAS DE DADOS TÉCNICOS
-- ============================================

-- Dados técnicos de torres
CREATE TABLE tower_technical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    object_id VARCHAR(100) NOT NULL,
    object_seq SERIAL UNIQUE,
    tower_type VARCHAR(50),
    object_height DECIMAL(10,2),
    object_elevation DECIMAL(10,2),
    x_coordinate DECIMAL(15,6),
    y_coordinate DECIMAL(15,6),
    deflection VARCHAR(100),
    go_forward DECIMAL(10,2),
    fuso_object VARCHAR(100),
    fix_conductor VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tower_technical_data IS 'Dados técnicos de torres e estruturas';

-- Dados técnicos de vãos (spans)
CREATE TABLE span_technical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    span_name VARCHAR(255),
    tower_start_id VARCHAR(100) NOT NULL,
    tower_end_id VARCHAR(100) NOT NULL,
    span_length DECIMAL(10,2),
    height_start DECIMAL(10,2),
    height_end DECIMAL(10,2),
    elevation_start DECIMAL(10,2),
    elevation_end DECIMAL(10,2),
    sag DECIMAL(10,2),
    tension DECIMAL(10,2),
    weight_per_meter DECIMAL(10,4),
    catenary_constant DECIMAL(10,4),
    arc_length DECIMAL(10,2),
    horizontal_angle DECIMAL(5,2),
    vertical_angle DECIMAL(5,2),
    radius_of_curvature DECIMAL(10,2),
    cable_type VARCHAR(100),
    voltage_kv DECIMAL(10,2),
    cable_color VARCHAR(50) DEFAULT '#0ea5e9',
    cable_phases INTEGER DEFAULT 3,
    cable_spacing DECIMAL(5,3) DEFAULT 0.5,
    geometry_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE span_technical_data IS 'Dados técnicos de vãos entre torres';

-- Configurações de cabos 3D
CREATE TABLE project_3d_cable_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    settings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE project_3d_cable_settings IS 'Configurações de visualização de cabos 3D';

-- ============================================
-- 7. TABELAS DE CONTROLE DE PROGRESSO
-- ============================================

-- Etapas de trabalho
CREATE TABLE work_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES work_stages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weight DECIMAL(5,2) DEFAULT 1.0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE work_stages IS 'Etapas/fases do trabalho';

-- Progresso das etapas
CREATE TABLE stage_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES work_stages(id) ON DELETE CASCADE,
    planned_percentage DECIMAL(5,2) DEFAULT 0.0,
    actual_percentage DECIMAL(5,2) DEFAULT 0.0,
    recorded_date DATE DEFAULT CURRENT_DATE,
    updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stage_progress IS 'Progresso das etapas de trabalho';

-- Metas mensais do projeto
CREATE TABLE project_monthly_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    target_month DATE NOT NULL,
    planned_hours DECIMAL(10,2) DEFAULT 0,
    planned_progress_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, site_id, target_month)
);

COMMENT ON TABLE project_monthly_targets IS 'Metas mensais de horas e progresso';

-- ============================================
-- 8. TABELAS DE REGISTROS OPERACIONAIS
-- ============================================

-- Registros de ponto
CREATE TABLE time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('entry', 'exit')),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    photo_url TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    local_id VARCHAR(100),
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE time_records IS 'Registros de entrada/saída de funcionários';

-- Relatórios diários
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    activities TEXT NOT NULL,
    observations TEXT,
    created_by UUID,
    local_id VARCHAR(100),
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE daily_reports IS 'Relatórios diários de atividades';

-- ============================================
-- 9. TABELAS DE COMUNICAÇÃO E TICKETS
-- ============================================

-- Mensagens/tickets do sistema
CREATE TABLE system_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID,
    sender_email VARCHAR(255),
    recipient_id UUID,
    recipient_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    recipient_role VARCHAR(100),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN (
        'PASSWORD_RESET', 'ADMINISTRATIVE', 'HR', 'OPERATIONAL', 'DIRECT', 'OTHER'
    )),
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachment_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'IN_ANALYSIS', 'AWAITING_RESPONSE', 'APPROVED', 'REJECTED', 'CLOSED'
    )),
    metadata JSONB DEFAULT '{}',
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_messages IS 'Mensagens e tickets do sistema';

-- Histórico de tickets
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES system_messages(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    performed_by UUID,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ticket_history IS 'Histórico de alterações em tickets';

-- ============================================
-- 10. TABELAS DE SINCRONIZAÇÃO E AUTENTICAÇÃO
-- ============================================

-- Fila de sincronização (offline/online)
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE sync_queue IS 'Fila de sincronização para operação offline';

-- Sessões QR Code
CREATE TABLE qr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired', 'completed')),
    auth_payload JSONB,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE qr_sessions IS 'Sessões de autenticação por QR Code';

-- ============================================
-- 11. TABELAS DE AUDITORIA E CONTROLE
-- ============================================

-- Overrides de permissão (temporários)
CREATE TABLE temporary_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    permission_type VARCHAR(100) NOT NULL,
    granted_by UUID,
    ticket_id UUID REFERENCES system_messages(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE temporary_permissions IS 'Permissões temporárias para usuários';

-- Logs de auditoria de permissões
CREATE TABLE permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE permission_audit_logs IS 'Logs de auditoria de alterações de permissão';

-- ============================================
-- 12. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para empresas
CREATE INDEX idx_companies_tax_id ON companies(tax_id);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- Índices para projetos
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_code ON projects(code);

-- Índices para sites
CREATE INDEX idx_sites_project_id ON sites(project_id);

-- Índices para funcionários
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_registration_number ON employees(registration_number);
CREATE INDEX idx_employees_cpf ON employees(cpf);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_is_active ON employees(is_active);

-- Índices para times
CREATE INDEX idx_teams_company_id ON teams(company_id);
CREATE INDEX idx_teams_site_id ON teams(site_id);
CREATE INDEX idx_teams_supervisor_id ON teams(supervisor_id);

-- Índices para documentos
CREATE INDEX idx_construction_documents_project_id ON construction_documents(project_id);
CREATE INDEX idx_construction_documents_site_id ON construction_documents(site_id);
CREATE INDEX idx_construction_documents_document_type ON construction_documents(document_type);

-- Índices para registros de ponto
CREATE INDEX idx_time_records_employee_id ON time_records(employee_id);
CREATE INDEX idx_time_records_recorded_at ON time_records(recorded_at);
CREATE INDEX idx_time_records_company_id ON time_records(company_id);

-- Índices para relatórios
CREATE INDEX idx_daily_reports_team_id ON daily_reports(team_id);
CREATE INDEX idx_daily_reports_report_date ON daily_reports(report_date);

-- Índices para dados técnicos
CREATE INDEX idx_tower_data_project_id ON tower_technical_data(project_id);
CREATE INDEX idx_tower_data_object_id ON tower_technical_data(object_id);
CREATE INDEX idx_span_data_project_id ON span_technical_data(project_id);

-- Índices para mensagens
CREATE INDEX idx_system_messages_recipient_id ON system_messages(recipient_id);
CREATE INDEX idx_system_messages_status ON system_messages(status);
CREATE INDEX idx_system_messages_message_type ON system_messages(message_type);

-- ============================================
-- 13. FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para validação de CPF
CREATE OR REPLACE FUNCTION validate_employee_cpf()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cpf IS NOT NULL AND LENGTH(REGEXP_REPLACE(NEW.cpf, '[^0-9]', '', 'g')) != 11 THEN
        RAISE EXCEPTION 'CPF inválido: deve conter 11 dígitos';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_employee_cpf_trigger BEFORE INSERT OR UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION validate_employee_cpf();

-- ============================================
-- 14. INSERTS INICIAIS (DADOS DE SISTEMA)
-- ============================================

-- Níveis de permissão padrão
INSERT INTO permission_levels (id, name, rank, is_system) VALUES
    (gen_random_uuid(), 'Super Administrador', 100, TRUE),
    (gen_random_uuid(), 'Administrador', 90, FALSE),
    (gen_random_uuid(), 'Gerente', 80, FALSE),
    (gen_random_uuid(), 'Coordenador', 70, FALSE),
    (gen_random_uuid(), 'Supervisor', 60, FALSE),
    (gen_random_uuid(), 'Técnico', 50, FALSE),
    (gen_random_uuid(), 'Operador', 40, FALSE),
    (gen_random_uuid(), 'Colaborador', 30, FALSE);

-- Módulos padrão do sistema
INSERT INTO permission_modules (id, code, name, category) VALUES
    (gen_random_uuid(), 'DASHBOARD', 'Dashboard', 'Geral'),
    (gen_random_uuid(), 'PROJECTS', 'Projetos', 'Gestão'),
    (gen_random_uuid(), 'EMPLOYEES', 'Funcionários', 'RH'),
    (gen_random_uuid(), 'TEAMS', 'Equipes', 'RH'),
    (gen_random_uuid(), 'TIME_RECORDS', 'Registro de Ponto', 'Operacional'),
    (gen_random_uuid(), 'REPORTS', 'Relatórios', 'Gestão'),
    (gen_random_uuid(), 'DOCUMENTS', 'Documentos', 'Técnico'),
    (gen_random_uuid(), '3D_VIEWER', 'Visualizador 3D', 'Técnico'),
    (gen_random_uuid(), 'SETTINGS', 'Configurações', 'Sistema');

-- ============================================
-- FIM DO SCRIPT
-- ============================================