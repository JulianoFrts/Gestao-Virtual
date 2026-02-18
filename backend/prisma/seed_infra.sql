-- Migração de Dados: Infraestrutura Básica (OrioN & LA TESTE)
-- Empresa
INSERT INTO "companies" ("id", "name", "tax_id", "is_active", "created_at", "updated_at")
VALUES ('corp_orion', 'OrioN Energia S.A.', '12345678000199', true, NOW(), NOW());

-- Projeto
INSERT INTO "projects" ("id", "name", "code", "description", "status", "company_id", "start_date", "end_date", "created_at", "updated_at")
VALUES ('proj_lateste', 'LA TESTE', 'LT-TESTE-001', 'Projeto de Verificação e Testes', 'active', 'corp_orion', '2024-01-01', '2025-12-31', NOW(), NOW());

-- Canteiros
INSERT INTO "sites" ("id", "name", "code", "project_id", "created_at", "updated_at") VALUES
('site_cc_ara', 'Canteiro Central - Araraquara', 'CC-ARA', 'proj_lateste', NOW(), NOW()),
('site_fs_sca', 'Frente de Serviço 01 - São Carlos', 'FS-SCA', 'proj_lateste', NOW(), NOW()),
('site_fs_rcl', 'Frente de Serviço 02 - Rio Claro', 'FS-RCL', 'proj_lateste', NOW(), NOW()),
('site_ca_tau', 'Canteiro de Apoio - Taubaté', 'CA-TAU', 'proj_lateste', NOW(), NOW());
