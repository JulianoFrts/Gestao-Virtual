-- Migração de Dados: Produção (Categorias e Atividades)
-- Categorias
INSERT INTO "production_categories" ("id", "name", "description", "order", "created_at", "updated_at") VALUES
('cat_fund', 'Fundação', 'Etapa de escavação e concretagem das bases', 10, NOW(), NOW()),
('cat_mont', 'Montagem', 'Montagem das estruturas metálicas', 20, NOW(), NOW()),
('cat_cabos', 'Cabos', 'Lançamento e regulação de cabos condutores e para-raios', 30, NOW(), NOW());

-- Atividades - Fundação
INSERT INTO "production_activities" ("id", "category_id", "name", "weight", "order", "created_at", "updated_at") VALUES
('act_escav', 'cat_fund', 'Escavação', 1.0, 1, NOW(), NOW()),
('act_armac', 'cat_fund', 'Armação', 1.0, 2, NOW(), NOW()),
('act_concr', 'cat_fund', 'Concretagem', 1.0, 3, NOW(), NOW()),
('act_reat', 'cat_fund', 'Reaterro', 0.5, 4, NOW(), NOW());

-- Atividades - Montagem
INSERT INTO "production_activities" ("id", "category_id", "name", "weight", "order", "created_at", "updated_at") VALUES
('act_premon', 'cat_mont', 'Pré-Montagem', 1.0, 1, NOW(), NOW()),
('act_icam', 'cat_mont', 'Içamento', 1.0, 2, NOW(), NOW()),
('act_revis', 'cat_mont', 'Revisão', 0.5, 3, NOW(), NOW()),
('act_torq', 'cat_mont', 'Torqueamento', 0.5, 4, NOW(), NOW());

-- Atividades - Cabos
INSERT INTO "production_activities" ("id", "category_id", "name", "weight", "order", "created_at", "updated_at") VALUES
('act_cabguia', 'cat_cabos', 'Lançamento Cabo Guia', 1.0, 1, NOW(), NOW()),
('act_condut', 'cat_cabos', 'Lançamento Condutor', 2.0, 2, NOW(), NOW()),
('act_gramp', 'cat_cabos', 'Grampeação', 1.0, 3, NOW(), NOW()),
('act_regul', 'cat_cabos', 'Regulação', 1.0, 4, NOW(), NOW());
