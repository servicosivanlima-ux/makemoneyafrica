-- ============================================
-- UPDATE YOUTUBE CAMPAIGN PLANS AND PRICES (V5)
-- ============================================

DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v5(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, DOUBLE PRECISION, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v5(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, INTEGER);
-- Dropping with video_id to be safe
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v5(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, DOUBLE PRECISION, TEXT, TEXT, INTEGER, TEXT);

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
    p_video_duration INTEGER DEFAULT NULL,
    p_video_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id UUID;
    v_balance DOUBLE PRECISION;
    v_status TEXT;
    v_final_price DOUBLE PRECISION;
    v_final_target_count INTEGER;
BEGIN
    -- Get current balance
    SELECT wallet_balance INTO v_balance FROM public.profiles WHERE user_id = p_client_id;
    
    -- Validate Pricing for fixed plans or custom
    IF p_plan_type = 'kwanza' THEN
        -- YOUTUBE / KWANZA PLANS
        CASE p_plan_name
            WHEN 'Básico' THEN v_final_price := 3000; v_final_target_count := 50;
            WHEN 'Starter' THEN v_final_price := 5000; v_final_target_count := 100;
            WHEN 'Popular' THEN v_final_price := 10000; v_final_target_count := 250;
            WHEN 'Bronze' THEN v_final_price := 18000; v_final_target_count := 500;
            WHEN 'Prata' THEN v_final_price := 30000; v_final_target_count := 1000;
            WHEN 'Ouro' THEN v_final_price := 65000; v_final_target_count := 2500;
            WHEN 'Premium' THEN v_final_price := 120000; v_final_target_count := 5000;
            ELSE 
                v_final_price := p_price; 
                v_final_target_count := p_target_count;
        END CASE;
        v_status := 'pending_admin_setup';
    ELSE
        -- Default ta_no_limao / followers pricing
        CASE p_plan_name
            WHEN 'Básico' THEN v_final_price := 6000; v_final_target_count := 30;
            WHEN 'Super Básico' THEN v_final_price := 8000; v_final_target_count := 50;
            WHEN 'Tá Fixe' THEN v_final_price := 15000; v_final_target_count := 100;
            WHEN 'Bronze' THEN v_final_price := 27000; v_final_target_count := 200;
            WHEN 'Prata' THEN v_final_price := 75000; v_final_target_count := 500;
            WHEN 'Ouro' THEN v_final_price := 125000; v_final_target_count := 1000;
            WHEN 'Premium' THEN v_final_price := 400000; v_final_target_count := 3500;
            ELSE 
                v_final_price := p_price; 
                v_final_target_count := p_target_count;
        END CASE;
        v_status := 'active';
    END IF;

    -- Final balance check
    IF v_balance < v_final_price THEN
        RAISE EXCEPTION 'Saldo insuficiente. Precisas de % Kz, mas tens % Kz.', v_final_price, v_balance;
    END IF;

    -- Deduct balance
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance - v_final_price 
    WHERE user_id = p_client_id;

    -- Create campaign
    INSERT INTO public.campaigns (
        client_id, plan_name, plan_type, platform, page_link, 
        target_count, price, campaign_goal, status,
        video_title, video_duration, video_id,
        video_link
    )
    VALUES (
        p_client_id, p_plan_name, p_plan_type::plan_type, p_platform::platform_type, p_page_link, 
        v_final_target_count, v_final_price, p_campaign_goal, v_status::campaign_status,
        p_video_title, p_video_duration, p_video_id,
        CASE WHEN p_plan_type = 'kwanza' THEN p_page_link ELSE NULL END
    )
    RETURNING id INTO v_campaign_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_client_id, v_final_price, 'payment', 'Campanha ' || p_plan_name || ' (' || p_platform || ')');

    RETURN v_campaign_id;
END;
$$;
