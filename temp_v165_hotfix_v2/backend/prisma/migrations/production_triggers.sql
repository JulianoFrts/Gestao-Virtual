-- triggers for production audit and automation

-- 1.1 Trigger: Automatically insert LOG on status/progress change
CREATE OR REPLACE FUNCTION fn_log_tower_activity_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent infinite loop if update is coming from approved_log trigger
    IF (tg_op = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.progress_percent IS DISTINCT FROM NEW.progress_percent)) THEN
        -- Check if it was an automated update from approval (optional, but good for metadata)
        INSERT INTO public.tower_activity_logs (
            id,
            tower_id,
            activity_id,
            status,
            progress_percent,
            start_date,
            end_date,
            changed_by,
            requires_approval,
            approval_status,
            metadata,
            created_at
        )
        VALUES (
            gen_random_uuid(),
            NEW.tower_id,
            NEW.activity_id,
            NEW.status,
            NEW.progress_percent,
            NEW.start_date,
            NEW.end_date,
            NEW.updated_by,
            FALSE,
            'APPROVED',
            jsonb_build_object(
                'source', 'AUTO_TRIGGER',
                'previous_status', OLD.status
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_activity_change ON public.tower_activity_status;
CREATE TRIGGER trg_log_activity_change
AFTER UPDATE ON public.tower_activity_status
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.progress_percent IS DISTINCT FROM NEW.progress_percent)
EXECUTE FUNCTION fn_log_tower_activity_change();


-- 1.2 Trigger: Date changes require approval
CREATE OR REPLACE FUNCTION fn_validate_date_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.start_date IS DISTINCT FROM NEW.start_date
       OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN

        INSERT INTO public.tower_activity_logs (
            id,
            tower_id,
            activity_id,
            status,
            progress_percent,
            start_date,
            end_date,
            changed_by,
            requires_approval,
            approval_status,
            comment,
            created_at
        )
        VALUES (
            gen_random_uuid(),
            NEW.tower_id,
            NEW.activity_id,
            NEW.status,
            NEW.progress_percent,
            NEW.start_date,
            NEW.end_date,
            NEW.updated_by,
            TRUE,
            'PENDING',
            'Alteração de data exige aprovação',
            NOW()
        );

        -- Block direct update by throwing exception
        -- Application code must handle this or it was intentional to block
        RAISE EXCEPTION 'Alteração de datas requer aprovação do gestor';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_dates ON public.tower_activity_status;
CREATE TRIGGER trg_validate_dates
BEFORE UPDATE OF start_date, end_date
ON public.tower_activity_status
FOR EACH ROW
EXECUTE FUNCTION fn_validate_date_change();


-- 1.3 Trigger: Apply approved log back to status
CREATE OR REPLACE FUNCTION fn_apply_approved_log()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.approval_status = 'APPROVED' AND (OLD.approval_status IS DISTINCT FROM 'APPROVED') THEN
        UPDATE public.tower_activity_status
        SET
            status = NEW.status,
            progress_percent = NEW.progress_percent,
            start_date = NEW.start_date,
            end_date = NEW.end_date,
            updated_at = NOW(),
            updated_by = NEW.approved_by
        WHERE
            tower_id = NEW.tower_id
            AND activity_id = NEW.activity_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_approved_log ON public.tower_activity_logs;
CREATE TRIGGER trg_apply_approved_log
AFTER UPDATE OF approval_status
ON public.tower_activity_logs
FOR EACH ROW
EXECUTE FUNCTION fn_apply_approved_log();
