-- ============================================
-- FIX FINAL: Criar tabela video_sessions e funções YouTube
-- Executar no Supabase SQL Editor do projeto xofpoelcmcfpzmkopecu
-- ============================================

-- 1. Criar a tabela video_sessions (necessária para o fluxo YouTube)
CREATE TABLE IF NOT EXISTS public.video_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id),
    token TEXT NOT NULL,
    ip_address TEXT,
    start_time TIMESTAMPTZ DEFAULT now(),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS for video_sessions
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Corrigidas para usar has_role em vez da coluna inexistente 'role'
DROP POLICY IF EXISTS "Users can view own video sessions" ON public.video_sessions;
CREATE POLICY "Users can view own video sessions" ON public.video_sessions 
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own video sessions" ON public.video_sessions;
CREATE POLICY "Users can create own video sessions" ON public.video_sessions 
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all video sessions" ON public.video_sessions;
CREATE POLICY "Admins can view all video sessions" ON public.video_sessions 
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Remover temporariamente views que dependem das colunas que vamos alterar
DROP VIEW IF EXISTS public.available_campaigns_for_workers;

-- 4. Garantir tipos de dados NUMERIC para suportar pagamentos por segundo (ex: 0.16 Kz)
ALTER TABLE public.profiles ALTER COLUMN wallet_balance TYPE NUMERIC(15,2);
ALTER TABLE public.tasks ALTER COLUMN reward_amount TYPE NUMERIC(10,2);
ALTER TABLE public.campaigns ALTER COLUMN price TYPE NUMERIC(15,2);

-- 5. Adicionar colunas que faltam na tabela campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS reward_per_second FLOAT DEFAULT NULL;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS reward_amount_override NUMERIC DEFAULT NULL;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS remaining_budget NUMERIC DEFAULT NULL;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT NULL;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS video_id TEXT DEFAULT NULL;

-- 6. Recriar a view (definição original de RESTORE_DATABASE.sql)
CREATE OR REPLACE VIEW public.available_campaigns_for_workers WITH (security_invoker = on) AS
SELECT id, plan_type, plan_name, platform, page_link, profile_link, video_link, target_count, completed_count, status, created_at
FROM public.campaigns WHERE status = 'active';

GRANT SELECT ON public.available_campaigns_for_workers TO authenticated;

-- 7. Actualizar campanhas YouTube existentes: preencher remaining_budget e duration
UPDATE public.campaigns 
SET 
    remaining_budget = COALESCE(remaining_budget, price),
    duration = COALESCE(duration, video_duration, 60),
    reward_per_second = COALESCE(reward_per_second, 0.16666666666666666)
WHERE plan_type = 'kwanza' 
AND status = 'active'
AND remaining_budget IS NULL;

-- 6. Criar a função start_video_session (com cooldown de 24h)
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

GRANT EXECUTE ON FUNCTION public.start_video_session(UUID, TEXT, TEXT) TO authenticated;

-- 7. Criar a função validate_video_task (validação + pagamento)
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

    -- Calculate elapsed time
    v_elapsed := extract(epoch from (now() - v_session.start_time));
    
    -- Calculo da Recompensa: Segundos assistidos (máximo o tempo da campanha ou 5 minutos) * valor por segundo
    -- Fallback para 10Kz por 60s (0.1666... Kz/s)
    v_reward := ROUND((
        LEAST(v_elapsed, COALESCE(v_campaign.duration, 60), 300) 
        * COALESCE(
            v_campaign.reward_per_second, 
            v_campaign.reward_amount_override,
            0.16666666666666666
          )
    )::numeric, 2);

    IF v_reward <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tempo de visualização insuficiente');
    END IF;

    -- Check budget (opcional, se estivermos a rastrear remaining_budget)
    IF v_campaign.remaining_budget IS NOT NULL AND v_campaign.remaining_budget < v_reward THEN 
        RETURN jsonb_build_object('success', false, 'message', 'Orçamento da campanha insuficiente'); 
    END IF;

    -- Complete session
    UPDATE public.video_sessions SET completed = true WHERE id = p_session_id;

    -- Update campaign
    UPDATE public.campaigns 
    SET 
        remaining_budget = CASE WHEN remaining_budget IS NOT NULL THEN remaining_budget - v_reward ELSE remaining_budget END, 
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

GRANT EXECUTE ON FUNCTION public.validate_video_task(UUID, TEXT, BOOLEAN) TO authenticated;

-- 8. Recarregar o schema do PostgREST
NOTIFY pgrst, 'reload schema';
