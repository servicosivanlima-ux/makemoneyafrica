-- ============================================
-- FIX: Adicionar coluna 'activated_at' na tabela campaigns
-- Execute no Supabase SQL Editor do projeto xofpoelcmcfpzmkopecu
-- ============================================

DO $$ 
BEGIN 
    -- 1. Adicionar a coluna activatated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='activated_at') THEN
        ALTER TABLE public.campaigns ADD COLUMN activated_at timestamp with time zone;
    END IF;

    -- 2. Garantir que a coluna reward_amount_override (se existir na RPC) está presente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='reward_amount_override') THEN
        ALTER TABLE public.campaigns ADD COLUMN reward_amount_override numeric;
    END IF;
END $$;

-- 3. Actualizar a função de activação para ser à prova de falhas
CREATE OR REPLACE FUNCTION public.admin_activate_youtube_campaign(
  p_campaign_id uuid,
  p_reward_per_second numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores.';
  END IF;
  
  -- Atualizar a campanha para activa
  UPDATE campaigns
  SET 
    status = 'active', 
    updated_at = now(),
    activated_at = now(),
    reward_amount_override = p_reward_per_second
  WHERE id = p_campaign_id AND status = 'pending_admin_setup';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha não encontrada ou não está no estado pending_admin_setup.';
  END IF;
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activate_youtube_campaign(uuid, numeric) TO authenticated;
NOTIFY pgrst, 'reload schema';
