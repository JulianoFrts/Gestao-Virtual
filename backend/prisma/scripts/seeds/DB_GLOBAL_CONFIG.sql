-- DB_GLOBAL_CONFIG.sql (v135)
-- Objetivo: Garantir que o search_path e permissões sejam globais para o bando 'squarecloud'.

-- 1. Definir search_path no nível do BANCO (afeta todas as conexões a este banco)
ALTER DATABASE squarecloud SET search_path TO gestao_virtual, public;

-- 2. Garantir que o usuário OWNER de fato tem poder sobre o banco
ALTER DATABASE squarecloud OWNER TO squarecloud;

-- 3. Confirmar permissões de conexão
GRANT CONNECT ON DATABASE squarecloud TO public;
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA gestao_virtual TO public;

-- 4. Verificação final
SELECT datname, datconfig FROM pg_database WHERE datname = 'squarecloud';
SHOW search_path;
