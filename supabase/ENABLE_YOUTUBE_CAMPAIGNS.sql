-- Add video fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS video_title TEXT,
ADD COLUMN IF NOT EXISTS video_duration INTEGER;

-- Ensure the view is updated to include new columns
DROP VIEW IF EXISTS public.available_campaigns_for_workers;
CREATE OR REPLACE VIEW public.available_campaigns_for_workers WITH (security_invoker = on) AS
SELECT c.*
FROM public.campaigns c
WHERE c.status = 'active'
AND c.target_count > c.completed_count
AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.campaigns past_c ON t.campaign_id = past_c.id
    WHERE t.worker_id = auth.uid()
    AND t.status IN ('in_progress', 'pending_review', 'approved')
    AND (
        -- For 'Followers' plan: Block by page_link
        (c.plan_type = 'ta_no_limao' AND past_c.page_link = c.page_link AND past_c.plan_type = 'ta_no_limao')
        OR
        -- For 'Kwanza' plan: Block by video_link (specific post)
        (c.plan_type = 'kwanza' AND past_c.video_link = c.video_link AND past_c.plan_type = 'kwanza')
    )
);

-- Update create_campaign_with_balance to handle v5 (including YouTube fields)
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance_v5(
    p_client_id UUID,
    p_plan_name TEXT,
    p_plan_type TEXT,
    p_platform TEXT,
    p_page_link TEXT,
    p_target_count INTEGER,
    p_price DOUBLE PRECISION,
    p_campaign_goal TEXT DEFAULT 'followers',
    p_video_title TEXT DEFAULT NULL,
    p_video_duration INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id UUID;
    v_balance DOUBLE PRECISION;
    v_status TEXT;
BEGIN
    -- Check balance
    SELECT balance INTO v_balance FROM public.profiles WHERE user_id = p_client_id;
    
    IF v_balance < p_price THEN
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;

    -- Set status based on plan type
    -- YouTube campaigns (kwanza) go to pending_admin_setup
    IF p_plan_type = 'kwanza' THEN
        v_status := 'pending_admin_setup';
    ELSE
        v_status := 'active';
    END IF;

    -- Update balance
    UPDATE public.profiles 
    SET balance = balance - p_price 
    WHERE user_id = p_client_id;

    -- Create campaign
    INSERT INTO public.campaigns (
        client_id, plan_name, plan_type, platform, page_link, 
        target_count, price, campaign_goal, status,
        video_title, video_duration,
        video_link -- Copying page_link to video_link for consistency in Kwanza
    )
    VALUES (
        p_client_id, p_plan_name, p_plan_type, p_platform, p_page_link, 
        p_target_count, p_price, p_campaign_goal, v_status,
        p_video_title, p_video_duration,
        CASE WHEN p_plan_type = 'kwanza' THEN p_page_link ELSE NULL END
    )
    RETURNING id INTO v_campaign_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_client_id, p_price, 'payment', 'Pagamento de campanha: ' || p_plan_name);

    RETURN v_campaign_id;
END;
$$;

-- Admin function to activate YouTube campaign
CREATE OR REPLACE FUNCTION public.admin_activate_youtube_campaign(
    p_campaign_id UUID,
    p_worker_reward DOUBLE PRECISION
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update campaign
    UPDATE public.campaigns
    SET 
        status = 'active',
        worker_reward = p_worker_reward
    WHERE id = p_campaign_id 
    AND plan_type = 'kwanza'
    AND status = 'pending_admin_setup';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;
