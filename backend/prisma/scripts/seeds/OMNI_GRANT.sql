-- OMNI_GRANT.sql (v134)
-- Tentativa final de abrir todas as portas no banco.

-- 1. Dar permissão total para a role 'public' (qualquer um logado)
GRANT CONNECT ON DATABASE squarecloud TO public;
GRANT USAGE ON SCHEMA public TO public;
GRANT ALL ON ALL TABLES IN SCHEMA public TO public;

-- 2. Reforçar o dono
ALTER DATABASE squarecloud OWNER TO squarecloud;
ALTER SCHEMA public OWNER TO squarecloud;

-- 3. Schema dedicado com permissões mundiais
CREATE SCHEMA IF NOT EXISTS gestao_virtual;
GRANT ALL ON SCHEMA gestao_virtual TO public;
ALTER ROLE squarecloud SET search_path = gestao_virtual, public;

-- 4. Verificação de certificados do lado do DB (se possível)
SELECT name, setting FROM pg_settings WHERE name LIKE 'ssl%';
