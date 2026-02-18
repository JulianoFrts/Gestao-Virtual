-- Migração de Dados: Pessoal e Equipes (Parte 1 - Corrigida)
-- Cargos/Funções Únicos
INSERT INTO "job_functions" ("id", "company_id", "name", "hierarchy_level", "can_lead_team", "description", "created_at", "updated_at") VALUES
('jf_eng_res', 'corp_orion', 'ENGENHEIRO RESIDENTE', 1, true, 'MOI', NOW(), NOW()),
('jf_coord_obras', 'corp_orion', 'COORDENADOR DE OBRAS', 2, true, 'MOI', NOW(), NOW()),
('jf_eng_prod', 'corp_orion', 'ENGENHEIRO DE PRODUCAO', 3, true, 'MOI', NOW(), NOW()),
('jf_sup_lanc', 'corp_orion', 'SUPERVISOR DE LANÇAMENTO', 2, true, 'MOI', NOW(), NOW()),
('jf_sup_civil', 'corp_orion', 'SUPERVISOR DE CIVIL', 2, true, 'MOI', NOW(), NOW()),
('jf_sup_mont', 'corp_orion', 'SUPERVISOR DE MONTAGEM', 2, true, 'MOI', NOW(), NOW()),
('jf_aux_tec', 'corp_orion', 'AUXILIAR TECNICO', 5, false, 'MOI', NOW(), NOW()),
('jf_enc_rh', 'corp_orion', 'ENCARREGADO DE RECURSOS HUMANOS', 4, true, 'MOI', NOW(), NOW()),
('jf_tec_plan', 'corp_orion', 'TECNICO DE PLANEJAMENTO', 5, false, 'MOI', NOW(), NOW()),
('jf_ajudante', 'corp_orion', 'AJUDANTE', 11, false, 'MOD', NOW(), NOW());

-- Equipes principais da EAP
INSERT INTO "teams" ("id", "company_id", "name", "is_active", "created_at", "updated_at") VALUES
('team_gestao', 'corp_orion', 'LT-GESTÃO DA OBRA', true, NOW(), NOW()),
('team_producao', 'corp_orion', 'LT-PRODUÇÃO', true, NOW(), NOW()),
('team_rh', 'corp_orion', 'LT-RECURSOS HUMANOS', true, NOW(), NOW()),
('team_admin', 'corp_orion', 'LT-ADMINISTRAÇÃO', true, NOW(), NOW()),
('team_plan', 'corp_orion', 'LT-SEÇÃO TÉCNICA E PLANEJAMENTO', true, NOW(), NOW());

-- Funcionários Estratégicos (Amostra Operacional)
-- HUGO MIRANDA
INSERT INTO "users" ("id", "name", "registration_number", "function_id", "hierarchy_level", "created_at", "updated_at")
VALUES ('u_hugo', 'HUGO MIRANDA BASTOS DE OLIVEIRA', '9000051', 'jf_eng_res', 1, NOW(), NOW());
INSERT INTO "auth_credentials" ("id", "user_id", "email", "password", "role", "status", "created_at", "updated_at")
VALUES ('auth_hugo', 'u_hugo', '9000051@orion.pro', '$2b$10$EpWa/z.6q.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', 'MANAGER', 'ACTIVE', NOW(), NOW());
INSERT INTO "user_affiliations" ("id", "user_id", "company_id", "project_id", "created_at", "updated_at")
VALUES ('aff_hugo', 'u_hugo', 'corp_orion', 'proj_lateste', NOW(), NOW());
INSERT INTO "team_members" ("id", "team_id", "user_id", "joined_at")
VALUES ('tm_hugo', 'team_gestao', 'u_hugo', NOW());

-- CHARLES SILVA
INSERT INTO "users" ("id", "name", "registration_number", "function_id", "hierarchy_level", "created_at", "updated_at")
VALUES ('u_charles', 'CHARLES SILVA DE SOUZA', '90000233', 'jf_coord_obras', 2, NOW(), NOW());
INSERT INTO "auth_credentials" ("id", "user_id", "email", "password", "role", "status", "created_at", "updated_at")
VALUES ('auth_charles', 'u_charles', '90000233@orion.pro', '$2b$10$EpWa/z.6q.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', 'MANAGER', 'ACTIVE', NOW(), NOW());
INSERT INTO "user_affiliations" ("id", "user_id", "company_id", "project_id", "created_at", "updated_at")
VALUES ('aff_charles', 'u_charles', 'corp_orion', 'proj_lateste', NOW(), NOW());
INSERT INTO "team_members" ("id", "team_id", "user_id", "joined_at")
VALUES ('tm_charles', 'team_producao', 'u_charles', NOW());

-- JULIANO FREITAS (Funcionário)
INSERT INTO "users" ("id", "name", "registration_number", "function_id", "hierarchy_level", "created_at", "updated_at")
VALUES ('u_juliano_fun', 'JULIANO FREITAS DE MORAES', '7643', 'jf_tec_plan', 5, NOW(), NOW());
INSERT INTO "auth_credentials" ("id", "user_id", "email", "password", "role", "status", "created_at", "updated_at")
VALUES ('auth_juliano_fun', 'u_juliano_fun', '7643@orion.pro', '$2b$10$EpWa/z.6q.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', 'USER', 'ACTIVE', NOW(), NOW());
INSERT INTO "user_affiliations" ("id", "user_id", "company_id", "project_id", "created_at", "updated_at")
VALUES ('aff_juliano_fun', 'u_juliano_fun', 'corp_orion', 'proj_lateste', NOW(), NOW());
INSERT INTO "team_members" ("id", "team_id", "user_id", "joined_at")
VALUES ('tm_juliano_fun', 'team_plan', 'u_juliano_fun', NOW());
