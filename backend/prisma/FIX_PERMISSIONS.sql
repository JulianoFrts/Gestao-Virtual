-- FIX_PERMISSIONS.sql (v126 - Owner Fix)
-- Execute este script no seu banco de dados para garantir CONTROLE TOTAL.
-- O erro 'denied access on database squarecloud.public' persiste mesmo após GRANT.
-- Isso geralmente indica que o schema pertence a 'postgres' e o usuário 'squarecloud' não pode acessá-lo totalmente.

-- 1. Tornar 'squarecloud' o PROPRIETÁRIO do schema public.
-- Isso dá poderes absolutos sobre o namespace.
ALTER SCHEMA public OWNER TO squarecloud;

-- 2. Garantir permissões novamente (just in case)
GRANT ALL ON SCHEMA public TO squarecloud;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO squarecloud;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO squarecloud;

-- 3. Garantir privilégios futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO squarecloud;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO squarecloud;

-- 4. Teste de sanity (Se rodar sem erro, você tem acesso)
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
