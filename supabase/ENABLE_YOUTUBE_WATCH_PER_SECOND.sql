-- ============================================
-- YOUTUBE WATCH-PER-SECOND (60s = 10 Kz)
-- ============================================

-- 1. Add reward_per_second column
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS reward_per_second FLOAT DEFAULT 0.16666666666666666;

-- 2. Update admin activation RPC to include reward_per_second
-- We drop first because parameter names are changing
DROP FUNCTION IF EXISTS public.admin_activate_youtube_campaign(UUID, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.admin_activate_youtube_campaign(UUID, FLOAT);

CREATE OR REPLACE FUNCTION public.admin_activate_youtube_campaign(
    p_campaign_id UUID,
    p_reward_per_second FLOAT DEFAULT 0.16666666666666666
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.campaigns 
    SET 
        status = 'active',
        reward_per_second = p_reward_per_second,
        activated_at = now()
    WHERE id = p_campaign_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update validation RPC for dynamic calculation
DROP FUNCTION IF EXISTS public.validate_video_task(UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.validate_video_task(
    p_session_id UUID, p_token TEXT, p_is_subscribed BOOLEAN
) RETURNS JSONB AS $$
DECLARE 
    v_session public.video_sessions%ROWTYPE; 
    v_campaign public.campaigns%ROWTYPE; 
    v_elapsed INTEGER; 
    v_reward NUMERIC;
BEGIN
    -- Get session and user
    SELECT * INTO v_session FROM public.video_sessions WHERE id = p_session_id AND user_id = auth.uid();
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada'); END IF;
    IF v_session.completed THEN RETURN jsonb_build_object('success', false, 'message', 'Tarefa já concluída'); END IF;

    -- Get campaign
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_session.campaign_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada'); END IF;

    -- Validate token
    IF v_session.token != p_token THEN RETURN jsonb_build_object('success', false, 'message', 'Token inválido'); END IF;

    -- Calculate elapsed time and reward
    v_elapsed := extract(epoch from (now() - v_session.start_time));
    
    -- Ensure we don't pay more than the duration or what the user actually watched
    -- v_reward := LEAST(v_elapsed, v_campaign.duration) * COALESCE(v_campaign.reward_per_second, 0.16666666666666666);
    -- Let's use numeric for precision and then round it
    v_reward := ROUND((LEAST(v_elapsed, v_campaign.duration) * COALESCE(v_campaign.reward_per_second, 0.16666666666666666))::numeric, 2);

    IF v_reward <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tempo de visualização insuficiente para gerar recompensa');
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

    RETURN jsonb_build_object('success', true, 'reward', v_reward, 'seconds', LEAST(v_elapsed, v_campaign.duration));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
