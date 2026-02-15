-- SETUP_NEW_SCHEMA.sql (v127)
-- Solução "Nuclear" para permissões: Criar um schema limpo e dedicado.
-- O schema 'public' parece ter restrições de ambiente DBaaS que não conseguimos remover.

-- 1. Criar Schema Dedicado
-- Se não existir, cria. Se existir, não faz nada (seguro).
CREATE SCHEMA IF NOT EXISTS gestao_virtual AUTHORIZATION squarecloud;

-- 2. Garantir Permissões (Redundância necessária)
GRANT ALL ON SCHEMA gestao_virtual TO squarecloud;

-- 3. Garantir privilégios em objetos futuros dentro deste schema
ALTER DEFAULT PRIVILEGES IN SCHEMA gestao_virtual GRANT ALL ON TABLES TO squarecloud;
ALTER DEFAULT PRIVILEGES IN SCHEMA gestao_virtual GRANT ALL ON SEQUENCES TO squarecloud;
ALTER DEFAULT PRIVILEGES IN SCHEMA gestao_virtual GRANT ALL ON FUNCTIONS TO squarecloud;

-- 4. Definir 'search_path' para que 'gestao_virtual' seja o padrão (opcional, mas bom)
ALTER ROLE squarecloud SET search_path TO gestao_virtual, public;

-- 5. Teste de sanity
SELECT schema_name, schema_owner FROM information_schema.schemata WHERE schema_name = 'gestao_virtual';
