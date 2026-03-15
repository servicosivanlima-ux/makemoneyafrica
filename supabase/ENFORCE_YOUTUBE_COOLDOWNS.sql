-- ============================================
-- ENFORCE 24H COOLDOWN PER VIDEO
-- ============================================

-- 1. Update the available campaigns view
-- Filters out videos completed within the last 24 hours
CREATE OR REPLACE VIEW public.available_campaigns_for_workers WITH (security_invoker = on) AS
SELECT c.*
FROM public.campaigns c
WHERE c.status = 'active'
AND (c.target_count > c.completed_count OR c.target_count IS NULL) -- Allow for continuous campaigns if specified
AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.campaigns past_c ON t.campaign_id = past_c.id
    WHERE t.worker_id = auth.uid()
    AND t.status IN ('in_progress', 'pending_review', 'approved')
    AND (
        -- For 'Followers' plan: Still blocked forever (one follow per account)
        (c.plan_type = 'ta_no_limao' AND past_c.page_link = c.page_link AND past_c.plan_type = 'ta_no_limao')
        OR
        -- For 'Kwanza' (YouTube): Block ONLY if completed in the last 24 hours
        (
            c.plan_type = 'kwanza' 
            AND past_c.video_id = c.video_id 
            AND past_c.plan_type = 'kwanza'
            AND (
                t.status != 'approved' OR 
                t.completed_at > (now() - interval '24 hours')
            )
        )
    )
);

-- 2. Update start_video_session to check for cooldown
DROP FUNCTION IF EXISTS public.start_video_session(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.start_video_session(p_campaign_id UUID, p_token TEXT, p_ip TEXT)
RETURNS UUID AS $$
DECLARE 
    v_session_id UUID;
    v_video_id TEXT;
    v_last_completion TIMESTAMPTZ;
BEGIN
    -- Get current video_id
    SELECT video_id INTO v_video_id FROM public.campaigns WHERE id = p_campaign_id;

    -- Check if user completed this video in the last 24h
    SELECT MAX(completed_at) INTO v_last_completion 
    FROM public.tasks t
    JOIN public.campaigns c ON t.campaign_id = c.id
    WHERE t.worker_id = auth.uid()
    AND c.video_id = v_video_id
    AND t.status = 'approved'
    AND t.completed_at > (now() - interval '24 hours');

    IF v_last_completion IS NOT NULL THEN
        RAISE EXCEPTION 'Já concluíste este vídeo hoje. Poderás repetir após 24h (Última vez: %)', v_last_completion;
    END IF;

    -- Create session
    INSERT INTO public.video_sessions (user_id, campaign_id, token, ip_address)
    VALUES (auth.uid(), p_campaign_id, p_token, p_ip)
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update validation RPC to double-check cooldown at the moment of approval
DROP FUNCTION IF EXISTS public.validate_video_task(UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.validate_video_task(
    p_session_id UUID, p_token TEXT, p_is_subscribed BOOLEAN
) RETURNS JSONB AS $$
DECLARE 
    v_session public.video_sessions%ROWTYPE; 
    v_campaign public.campaigns%ROWTYPE; 
    v_elapsed INTEGER; 
    v_reward NUMERIC;
    v_last_completion TIMESTAMPTZ;
BEGIN
    -- Get session and user
    SELECT * INTO v_session FROM public.video_sessions WHERE id = p_session_id AND user_id = auth.uid();
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada'); END IF;
    IF v_session.completed THEN RETURN jsonb_build_object('success', false, 'message', 'Tarefa já concluída'); END IF;

    -- Get campaign
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_session.campaign_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada'); END IF;

    -- DOUBLE CHECK 24H COOLDOWN
    SELECT MAX(completed_at) INTO v_last_completion 
    FROM public.tasks t
    JOIN public.campaigns c ON t.campaign_id = c.id
    WHERE t.worker_id = auth.uid()
    AND c.video_id = v_campaign.video_id
    AND t.status = 'approved'
    AND t.completed_at > (now() - interval '24 hours');

    IF v_last_completion IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Limite diário atingido para este vídeo. Tente outro!');
    END IF;

    -- Validate token
    IF v_session.token != p_token THEN RETURN jsonb_build_object('success', false, 'message', 'Token inválido'); END IF;

    -- Calculate elapsed time and reward
    v_elapsed := extract(epoch from (now() - v_session.start_time));
    
    -- Reward Calculation (60s = 10 Kz -> 0.1666... Kz/sec)
    v_reward := ROUND((LEAST(v_elapsed, v_campaign.duration) * COALESCE(v_campaign.reward_per_second, 0.16666666666666666))::numeric, 2);

    IF v_reward <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tempo de visualização insuficiente');
    END IF;

    -- Check budget
    IF v_campaign.remaining_budget < v_reward THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Orçamento da campanha insuficiente'); 
    END IF;

    -- Complete session
    UPDATE public.video_sessions SET completed = true WHERE id = p_session_id;

    -- Update campaign
    UPDATE public.campaigns 
    SET 
        remaining_budget = remaining_budget - v_reward, 
        completed_count = completed_count + 1 
    WHERE id = v_session.campaign_id;

    -- Update profile balance
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_reward WHERE user_id = auth.uid();

    -- Create task entry
    INSERT INTO public.tasks (campaign_id, worker_id, status, reward_amount, completed_at)
    VALUES (v_session.campaign_id, auth.uid(), 'approved', v_reward, now());

    RETURN jsonb_build_object('success', true, 'reward', v_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
