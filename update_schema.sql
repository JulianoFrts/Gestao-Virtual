-- Add projectId column to work_stages
ALTER TABLE work_stages ADD COLUMN IF NOT EXISTS project_id TEXT;

-- Add Foreign Key constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_stages_project_id_fkey') THEN
        ALTER TABLE work_stages
        ADD CONSTRAINT work_stages_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Create Index
CREATE INDEX IF NOT EXISTS work_stages_project_id_idx ON work_stages(project_id);
