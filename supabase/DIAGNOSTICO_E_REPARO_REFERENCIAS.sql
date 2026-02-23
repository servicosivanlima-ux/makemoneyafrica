-- DIAGNOSTICO_E_REPARO_REFERENCIAS.sql
-- Use este script para descobrir por que a comissão não foi paga e corrigir manualmente.

-- 1. VERIFICAR SE O CLIENTE TEM UM INDICADOR (REFERRER)
-- Substitua 'email_do_cliente@gmail.com' pelo e-mail do cliente que fez o depósito.
SELECT email, user_type, referred_by 
FROM public.profiles 
WHERE email = 'email_do_cliente@gmail.com';

-- Se 'referred_by' estiver NULL, a indicação não foi gravada no cadastro.

-- 2. VINCULAR INDICADOR MANUALMENTE (Se estiver vazio)
-- Se o cliente já existe mas não tem indicador, use este comando:
-- Substitua os e-mails corretamente.
UPDATE public.profiles
SET referred_by = (SELECT user_id FROM public.profiles WHERE email = 'email_do_trabalhador@gmail.com')
WHERE email = 'email_do_cliente@gmail.com'
AND referred_by IS NULL;

-- 3. TESTAR PAGAMENTO DE COMISSÃO MANUAL (Para um depósito existente)
-- Se o depósito já foi aprovado mas a comissão não caiu, este bloco tenta pagar agora.
DO $$
DECLARE
  v_client_email TEXT := 'email_do_cliente@gmail.com'; -- Email do cliente
  v_deposit_id UUID;
  v_amount INTEGER;
  v_referrer_id UUID;
  v_commission INTEGER;
  v_perc INTEGER := 10; -- Percentagem padrão
BEGIN
  -- 1. Pegar dados do depósito e cliente
  SELECT d.id, d.amount, p.referred_by INTO v_deposit_id, v_amount, v_referrer_id
  FROM public.deposits d
  JOIN public.profiles p ON d.client_id = p.user_id
  WHERE p.email = v_client_email
  AND d.status = 'approved'
  ORDER BY d.created_at DESC LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RAISE NOTICE 'Erro: Cliente não tem indicador vinculado.';
  ELSIF EXISTS (SELECT 1 FROM referral_commissions WHERE deposit_id = v_deposit_id) THEN
    RAISE NOTICE 'Aviso: Este depósito já gerou comissão anteriormente.';
  ELSE
    -- 2. Calcular e Pagar
    v_commission := FLOOR(v_amount * v_perc / 100);
    
    -- Atualizar carteira do trabalhador
    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + v_commission WHERE user_id = v_referrer_id;
    
    -- Registar comissão
    INSERT INTO referral_commissions (worker_id, client_id, deposit_id, deposit_amount, commission_amount, commission_percentage)
    VALUES (v_referrer_id, (SELECT user_id FROM profiles WHERE email = v_client_email), v_deposit_id, v_amount, v_commission, v_perc);
    
    RAISE NOTICE 'Sucesso! Comissão de % Kz paga ao indicador.', v_commission;
  END IF;
END $$;
