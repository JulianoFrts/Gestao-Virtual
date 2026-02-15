-- FIX_DB_PERMISSIONS.sql (v128)
-- O erro 'denied access on database' pode ser literal: bloqueio no nível do Banco, não só do Schema.

-- 1. Garantir conexão e criação de temporários no banco 'squarecloud'
GRANT CONNECT, TEMPORARY ON DATABASE squarecloud TO squarecloud;

-- 2. Reforçar ownership (Novamente, por garantia)
ALTER SCHEMA gestao_virtual OWNER TO squarecloud;

-- 3. Definir search_path para o USUÁRIO explicitamente no banco
ALTER ROLE squarecloud SET search_path = gestao_virtual, public;

-- 4. Verificação final
SELECT current_database(), current_user;
