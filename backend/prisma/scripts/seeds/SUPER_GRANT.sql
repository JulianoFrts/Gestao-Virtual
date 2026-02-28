-- SUPER_GRANT.sql (v133)
-- Objetivo: Eliminar qualquer dúvida de permissão no nível de BANCO e SCHEMA.

-- 1. Tornar o usuário OWNER do Banco de Dados (Pode falhar se não for superuser, mas tentamos)
ALTER DATABASE squarecloud OWNER TO squarecloud;

-- 2. Garantir privilégios TOTAIS no Banco
GRANT ALL PRIVILEGES ON DATABASE squarecloud TO squarecloud;

-- 3. Garantir privilégios TOTAIS no Schema Public
GRANT ALL PRIVILEGES ON SCHEMA public TO squarecloud;
ALTER SCHEMA public OWNER TO squarecloud;

-- 4. Garantir que o usuário tem acesso a TUDO criado no public
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO squarecloud;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO squarecloud;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO squarecloud;

-- 5. Garantir o mesmo para o schema dedicado (por via das dúvidas)
GRANT ALL PRIVILEGES ON SCHEMA gestao_virtual TO squarecloud;
ALTER SCHEMA gestao_virtual OWNER TO squarecloud;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA gestao_virtual TO squarecloud;

-- 6. Verificação de Sanidade
SELECT datname, datacl FROM pg_database WHERE datname = 'squarecloud';
SELECT current_user, session_user;
