
-- Migrate Teams to Canteiro Principal
UPDATE teams 
SET site_id = (SELECT id FROM sites WHERE name ILIKE '%Canteiro Principal%' LIMIT 1) 
WHERE (site_id IS NULL OR site_id IN (SELECT id FROM sites WHERE name ILIKE '%Canteiro Frente A%' OR name ILIKE '%Canteiro Frente B%'));

-- Migrate User Affiliations to Canteiro Principal
UPDATE user_affiliations 
SET site_id = (SELECT id FROM sites WHERE name ILIKE '%Canteiro Principal%' LIMIT 1), 
    project_id = (SELECT project_id FROM sites WHERE name ILIKE '%Canteiro Principal%' LIMIT 1) 
WHERE (site_id IS NULL OR site_id IN (SELECT id FROM sites WHERE name ILIKE '%Canteiro Frente A%' OR name ILIKE '%Canteiro Frente B%'));

-- Delete redundant sites
DELETE FROM sites 
WHERE name ILIKE '%Canteiro Frente A%' OR name ILIKE '%Canteiro Frente B%';
