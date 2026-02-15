-- ============================================
-- YOUTUBE VIDEO TASKS (KWANZA PLAN V2)
-- ============================================

-- 1. Update campaigns table with YouTube-specific fields
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS video_id TEXT,
ADD COLUMN IF NOT EXISTS channel_id TEXT,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS reward INTEGER,
ADD COLUMN IF NOT EXISTS total_budget INTEGER,
ADD COLUMN IF NOT EXISTS remaining_budget INTEGER;

-- 2. Create video_sessions table to track watch time
CREATE TABLE IF NOT EXISTS public.video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for video_sessions
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_sessions
DROP POLICY IF EXISTS "Users can view own video sessions" ON public.video_sessions;
CREATE POLICY "Users can view own video sessions" ON public.video_sessions 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own video sessions" ON public.video_sessions;
CREATE POLICY "Users can create own video sessions" ON public.video_sessions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all video sessions" ON public.video_sessions;
CREATE POLICY "Admins can view all video sessions" ON public.video_sessions 
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create wallets table (optional, but requested by user)
-- Note: We already have wallet_balance in profiles, but the user requested a 'wallets' table.
-- We will create it and sync it for better auditing/scaling.
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    saldo INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Initialize wallets for existing profiles
INSERT INTO public.wallets (user_id, saldo)
SELECT user_id, COALESCE(wallet_balance, 0) FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Trigger to sync profile wallet_balance to wallets table (optional but good for consistency)
CREATE OR REPLACE FUNCTION public.sync_profile_to_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, saldo)
  VALUES (NEW.user_id, NEW.wallet_balance)
  ON CONFLICT (user_id) DO UPDATE SET saldo = EXCLUDED.saldo, updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_profile_wallet ON public.profiles;
CREATE TRIGGER tr_sync_profile_wallet
AFTER INSERT OR UPDATE OF wallet_balance ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_wallet();

-- 4. RPC for starting a video session
CREATE OR REPLACE FUNCTION public.start_video_session(p_campaign_id UUID, p_token TEXT, p_ip TEXT)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO public.video_sessions (user_id, campaign_id, token, ip_address)
    VALUES (auth.uid(), p_campaign_id, p_token, p_ip)
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC for final video task validation
CREATE OR REPLACE FUNCTION public.validate_video_task(
    p_session_id UUID,
    p_token TEXT,
    p_is_subscribed BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_session public.video_sessions%ROWTYPE;
    v_campaign public.campaigns%ROWTYPE;
    v_elapsed INTEGER;
    v_required INTEGER;
BEGIN
    -- 1. Get session and campaign details
    SELECT * INTO v_session FROM public.video_sessions WHERE id = p_session_id AND user_id = auth.uid();
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada'); END IF;
    
    IF v_session.completed THEN RETURN jsonb_build_object('success', false, 'message', 'Tarefa já concluída'); END IF;
    
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_session.campaign_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada'); END IF;

    -- 2. Validate token
    IF v_session.token != p_token THEN RETURN jsonb_build_object('success', false, 'message', 'Token inválido'); END IF;

    -- 3. Validate elapsed time
    v_elapsed := extract(epoch from (now() - v_session.start_time));
    v_required := LEAST(floor(v_campaign.duration * 0.7), 300);
    
    IF v_elapsed < v_required THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tempo de visualização insuficiente. Necessário: ' || v_required || 's, Decorrido: ' || v_elapsed || 's');
    END IF;

    -- 4. Validate subscription
    IF NOT p_is_subscribed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Subscrição do canal não verificada');
    END IF;

    -- 5. Check remaining budget
    IF v_campaign.remaining_budget < v_campaign.reward THEN
        RETURN jsonb_build_object('success', false, 'message', 'Orçamento da campanha esgotado');
    END IF;

    -- 6. Success: Update state and distribute reward
    UPDATE public.video_sessions SET completed = true WHERE id = p_session_id;
    
    UPDATE public.campaigns 
    SET remaining_budget = remaining_budget - reward,
        completed_count = completed_count + 1
    WHERE id = v_session.campaign_id;
    
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + v_campaign.reward 
    WHERE user_id = auth.uid();
    
    -- Record as a task completion
    INSERT INTO public.tasks (campaign_id, worker_id, status, reward_amount, completed_at)
    VALUES (v_session.campaign_id, auth.uid(), 'approved', v_campaign.reward, now());

    RETURN jsonb_build_object('success', true, 'reward', v_campaign.reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- notify schema reload
NOTIFY pgrst, 'reload schema';
