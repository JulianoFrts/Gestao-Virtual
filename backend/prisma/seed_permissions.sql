-- Migração de Dados: Matriz de Permissões Básica
-- Níveis de Permissão (Removido updated_at que não existe no schema para estes modelos)
INSERT INTO "permission_levels" ("id", "name", "rank", "is_system", "description", "created_at") VALUES
('pl_helper', 'HELPER_SYSTEM', 2000, true, 'Nível de acesso para HELPER_SYSTEM', NOW()),
('pl_god', 'SUPER_ADMIN_GOD', 1500, true, 'Nível de acesso para SUPER_ADMIN_GOD', NOW()),
('pl_socio', 'SOCIO_DIRETOR', 1000, true, 'Nível de acesso para SOCIO_DIRETOR', NOW()),
('pl_admin', 'ADMIN', 950, true, 'Nível de acesso para ADMIN', NOW()),
('pl_ti', 'TI_SOFTWARE', 900, true, 'Nível de acesso para TI_SOFTWARE', NOW()),
('pl_manager', 'MANAGER', 850, true, 'Nível de acesso para MANAGER', NOW()),
('pl_worker', 'WORKER', 100, true, 'Nível de acesso para WORKER', NOW());

-- Módulos Básicos
INSERT INTO "permission_modules" ("id", "code", "name", "category", "created_at") VALUES
('mod_dash', 'dashboard', 'Painel Geral', 'Geral', NOW()),
('mod_clock', 'clock', 'Bate-ponto (Câmera)', 'Ponto Eletrônico', NOW()),
('mod_rdo', 'daily_reports', 'Relatórios Diários', 'Ponto Eletrônico', NOW()),
('mod_proj', 'projects.view', 'Visualizar Obras', 'Corporativo', NOW()),
('mod_3d', 'viewer_3d.view', 'Visualizador 3D', 'Ferramentas', NOW()),
('mod_audit', 'audit_logs.view', 'Logs de Auditoria', 'Administração', NOW()),
('mod_db', 'db_hub.manage', 'Database Hub', 'Administração', NOW());

-- Matriz de Permissões (Concede acesso aos God Levels)
INSERT INTO "permission_matrix" ("level_id", "module_id", "is_granted", "created_at")
SELECT 
    l.id, 
    m.id, 
    true, 
    NOW()
FROM "permission_levels" l
CROSS JOIN "permission_modules" m
WHERE l.rank >= 1000;
