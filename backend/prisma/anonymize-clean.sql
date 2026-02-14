
-- 1. Padronizar JobFunctions e Mão de Obra
UPDATE job_functions SET name = 'Montador Especialista' WHERE name ILIKE '%montador%';
UPDATE job_functions SET name = 'Encarregado de Obras', can_lead_team = true WHERE name ILIKE '%encarregado%';
UPDATE job_functions SET name = 'Técnico de Campo' WHERE name ILIKE '%tecnico%';
UPDATE job_functions SET name = 'Engenheiro de Produção', can_lead_team = true WHERE name ILIKE '%engenheiro%';
UPDATE job_functions SET name = 'Ajudante Geral' WHERE name ILIKE '%ajudante%' OR name ILIKE '%auxiliar%';
UPDATE job_functions SET name = 'Supervisor de Área', can_lead_team = true WHERE name ILIKE '%supervisor%';
UPDATE job_functions SET name = 'Mestre de Obras', can_lead_team = true WHERE name ILIKE '%mestre%';
UPDATE job_functions SET name = 'Assistente Administrativo' WHERE name ILIKE '%adm%' OR name ILIKE '%administrativo%';

-- 2. Anônimizar Usuários (Garantindo que não são nomes reais)
-- Usamos 'Colaborador' + Registration Number para nomes únicos e sem risco de vazamento
UPDATE users
SET 
    name = (CASE 
        WHEN name ILIKE '%encarregado%' THEN 'Encarregado ' || registration_number
        WHEN name ILIKE '%montador%' THEN 'Montador ' || registration_number
        ELSE 'Colaborador ' || registration_number
    END),
    email = 'user_' || id || '@orion.com',
    cpf = '000.000.000-00',
    phone = '(00) 00000-0000'
WHERE email NOT IN ('admin@orion.com', 'juliano@orion.com')
  AND role != 'SUPER_ADMIN_GOD';

-- 3. Garantir que todos tenham uma função (se nulo, atribui Montador)
WITH default_func AS (SELECT id FROM job_functions WHERE name = 'Montador Especialista' LIMIT 1)
UPDATE users 
SET function_id = (SELECT id FROM default_func) 
WHERE function_id IS NULL AND (SELECT id FROM default_func) IS NOT NULL;
