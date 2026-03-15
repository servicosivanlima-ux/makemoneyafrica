-- ============================================
-- DIVERSE TASKS SUPPORT
-- ============================================

-- 1. Extend platform_type enum (Diverse)
-- Note: In Postgres we can't easily add values to enum in a transaction if used in tables.
-- This script assumes it's safe to add. If it fails, manual intervention might be needed.
DO $$ 
BEGIN 
    ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'diverse';
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS reward_amount_override NUMERIC;

-- 2.5 Add column to tasks table for diverse tasks link submission
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS submission_link TEXT;

-- 3. Update create_campaign_with_balance_v5 to support description (optional, for clients later)
-- But user asked for ADMIN to create. So let's create a dedicated RPC for Admin.

CREATE OR REPLACE FUNCTION public.admin_create_diverse_task(
    p_title TEXT,
    p_description TEXT,
    p_target_count INTEGER,
    p_reward_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id UUID;
BEGIN
    -- Security check: only admins
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem criar tarefas diversas.';
    END IF;

    -- Create a "campaign" of type diverse
    INSERT INTO public.campaigns (
        client_id,
        plan_type,
        plan_name,
        platform,
        target_count,
        price,
        status,
        page_link,
        description,
        reward_amount_override,
        created_at,
        updated_at
    )
    VALUES (
        auth.uid(), -- Admin is the "client"
        'kwanza',
        p_title,
        'diverse',
        p_target_count,
        0, -- No price paid by admin to system
        'active',
        'https://makemoney.africa', -- Placeholder link
        p_description,
        p_reward_amount,
        now(),
        now()
    )
    RETURNING id INTO v_campaign_id;

    RETURN v_campaign_id;
END;
$$;
