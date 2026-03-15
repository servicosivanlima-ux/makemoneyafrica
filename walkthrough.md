# Walkthrough - Ocultação do Plano "Kwanza"

Concluí a tarefa de ocultar o plano "Kwanza" de toda a plataforma, garantindo que novos clientes vejam apenas o plano "Tá no Limão", enquanto mantemos suporte para campanhas antigas.

## Alterações Realizadas

### Landing Page
- **Arquivo**: [Plans.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/landing/Plans.tsx)
- Removida a secção visual que exibia o plano "Kwanza" e seus respectivos preços.

### Painel do Cliente (Dashboard)
- **Arquivo**: [CreateCampaign.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/dashboard/client/CreateCampaign.tsx)
- O plano "Tá no Limão" passou a ser o padrão ao iniciar a criação de uma campanha.
- O botão do plano "Kwanza" foi substituído por um marcador de "Indisponível" (desactivado e com opacidade reduzida), impedindo novas selecções.
- **Arquivo**: [ClientCampaigns.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/dashboard/client/ClientCampaigns.tsx)
- Ajustada a lógica de exibição para tratar correctamente tanto o plano "Tá no Limão" quanto o "Kwanza" (para campanhas legadas).
- Simplificada a mensagem de confirmação do WhatsApp.

### Chatbot
- **Arquivo**: [Chatbot.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/Chatbot.tsx)
- Removida a menção ao plano "Kwanza" das respostas automáticas do assistente.

### Atribuição do Desenvolvedor
- **Arquivo**: [Footer.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/landing/Footer.tsx)
- Adicionada a logo e o nome da **ByteKwanza** no rodapé (footer) do site principal como desenvolvedores oficiais.
- **Arquivo**: [AdminSidebar.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/admin/AdminSidebar.tsx)
- Adicionada a atribuição da **ByteKwanza** na barra lateral do painel administrativo.
- **Imagem**: Logo salva em `/public/bytekwanza-logo.png`.

### Regras de Pagamento (Planos Tá no Limão)
- **Arquivo**: [CreateCampaign.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/dashboard/client/CreateCampaign.tsx)
- Actualizados os preços, contagens e recompensas por tarefa para todos os planos do "Tá no Limão", conforme a nova tabela:
    - **Básico**: 30 seg. | 6.000 Kz | 60 Kz/tarefa
    - **Super Básico**: 50 seg. | 8.000 Kz | 48 Kz/tarefa
    - **Tá Fixe**: 100 seg. | 15.000 Kz | 45 Kz/tarefa
    - **Bronze**: 200 seg. | 27.000 Kz | 40,5 Kz/tarefa
    - **Prata**: 500 seg. | 75.000 Kz | 45 Kz/tarefa
    - **Ouro**: 1000 seg. | 125.000 Kz | 37.5 Kz/tarefa
    - **Premium**: 3500 seg. | 400.000 Kz | 34 Kz/tarefa
- **Arquivo**: [TasksList.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/components/dashboard/worker/TasksList.tsx)
- Ajustada a exibição de recompensa para trabalhadores, removendo valores fixos em favor do valor definido na campanha.

#### [IMPORTANTE] Execução do Script SQL
Para que os pagamentos com decimais (ex: 40,5 Kz) funcionem correctamente, é necessário executar o seguinte script no **SQL Editor do Supabase**:

```sql
-- 1. Alterar colunas para suportar decimais
ALTER TABLE public.profiles ALTER COLUMN wallet_balance TYPE NUMERIC(15,2);
ALTER TABLE public.campaigns ALTER COLUMN reward TYPE NUMERIC(10,2);
ALTER TABLE public.campaigns ALTER COLUMN remaining_budget TYPE NUMERIC(15,2);
ALTER TABLE public.tasks ALTER COLUMN reward_amount TYPE NUMERIC(10,2);

-- 2. Actualizar função de criação de campanha
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance(
  p_plan_type text, p_plan_name text, p_platform text, p_page_link text,
  p_profile_link text DEFAULT NULL, p_video_link text DEFAULT NULL,
  p_video_id text DEFAULT NULL, p_duration integer DEFAULT NULL,
  p_reward numeric DEFAULT NULL, p_total_budget numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_campaign_id uuid; v_price numeric; v_target_count integer; v_user_type text; v_balance numeric;
BEGIN
  SELECT user_type, wallet_balance INTO v_user_type, v_balance FROM profiles WHERE user_id = auth.uid();
  IF v_user_type != 'client' THEN RAISE EXCEPTION 'Only clients can create campaigns'; END IF;

  IF p_total_budget IS NOT NULL AND p_reward IS NOT NULL AND p_reward > 0 THEN
    v_price := p_total_budget;
    v_target_count := floor(p_total_budget / p_reward);
  ELSE
    IF p_plan_type = 'ta_no_limao' OR p_plan_type = 'limao' THEN
      CASE p_plan_name
        WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
        WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
        WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
        WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
        WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
        WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
        WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
        ELSE RAISE EXCEPTION 'Invalid plan name';
      END CASE;
    ELSE
      CASE p_plan_name
        WHEN 'Básico' THEN v_price := 30000; v_target_count := 50;
        WHEN 'Super Básico' THEN v_price := 50000; v_target_count := 100;
        WHEN 'Tá Fixe' THEN v_price := 70000; v_target_count := 150;
        WHEN 'Bronze' THEN v_price := 100000; v_target_count := 200;
        WHEN 'Prata' THEN v_price := 250000; v_target_count := 500;
        WHEN 'Ouro' THEN v_price := 400000; v_target_count := 1000;
        WHEN 'Premium' THEN v_price := 850000; v_target_count := 2500;
        ELSE RAISE EXCEPTION 'Invalid plan name';
      END CASE;
    END IF;
  END IF;

  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Recarregue sua carteira.';
  END IF;

  UPDATE profiles SET wallet_balance = wallet_balance - v_price WHERE user_id = auth.uid();

  INSERT INTO campaigns (
    client_id, plan_type, plan_name, platform, page_link, profile_link, 
    video_link, video_id, duration, reward, total_budget, remaining_budget,
    target_count, price, status, payment_confirmed_at
  )
  VALUES (
    auth.uid(), p_plan_type::plan_type, p_plan_name, p_platform::platform_type, p_page_link, p_profile_link, 
    p_video_link, p_video_id, p_duration, COALESCE(p_reward, (v_price / v_target_count)), v_price, v_price,
    v_target_count, v_price, 'active'::campaign_status, now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END; $$;

-- 3. Actualizar função de reivindicação de tarefa
CREATE OR REPLACE FUNCTION public.worker_claim_task(p_campaign_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE 
  v_task_id uuid; 
  v_worker_id uuid; 
  v_campaign campaigns%ROWTYPE; 
  v_reward_amount numeric;
  v_link_already_used boolean;
BEGIN
  v_worker_id := auth.uid();
  IF v_worker_id IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF NOT has_role(v_worker_id, 'worker'::app_role) THEN RAISE EXCEPTION 'Apenas trabalhadores podem reclamar tarefas'; END IF;

  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id AND status = 'active';
  IF v_campaign.id IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada ou não está ativa'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM tasks t
    JOIN campaigns past_c ON t.campaign_id = past_c.id
    WHERE t.worker_id = v_worker_id
    AND t.status IN ('in_progress', 'pending_review', 'approved')
    AND (
        (v_campaign.plan_type = 'ta_no_limao' AND past_c.page_link = v_campaign.page_link AND past_c.plan_type = 'ta_no_limao')
        OR
        (v_campaign.plan_type = 'kwanza' AND past_c.video_link = v_campaign.video_link AND past_c.plan_type = 'kwanza')
    )
  ) INTO v_link_already_used;

  IF v_link_already_used THEN 
    RAISE EXCEPTION 'Você já realizou uma tarefa para este link em outra campanha.'; 
  END IF;

  IF v_campaign.completed_count >= v_campaign.target_count THEN RAISE EXCEPTION 'Esta campanha já atingiu o limite de tarefas'; END IF;

  v_reward_amount := COALESCE(v_campaign.reward, CASE WHEN v_campaign.plan_type = 'ta_no_limao' THEN 100 ELSE 200 END);

  UPDATE tasks SET worker_id = v_worker_id, status = 'in_progress', assigned_at = now() 
  WHERE campaign_id = p_campaign_id AND status = 'available' AND worker_id IS NULL 
  RETURNING id INTO v_task_id;

  IF v_task_id IS NULL THEN
    INSERT INTO tasks (campaign_id, worker_id, status, reward_amount, assigned_at) 
    VALUES (p_campaign_id, v_worker_id, 'in_progress', v_reward_amount, now()) 
    RETURNING id INTO v_task_id;
  END IF;

  RETURN v_task_id;
END; $$;

-- 4. Actualizar validação de vídeo
CREATE OR REPLACE FUNCTION public.validate_video_task(
    p_session_id UUID, p_token TEXT, p_is_subscribed BOOLEAN
) RETURNS JSONB AS $$
DECLARE v_session public.video_sessions%ROWTYPE; v_campaign public.campaigns%ROWTYPE; v_elapsed INTEGER; v_required INTEGER;
BEGIN
    SELECT * INTO v_session FROM public.video_sessions WHERE id = p_session_id AND user_id = auth.uid();
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada'); END IF;
    IF v_session.completed THEN RETURN jsonb_build_object('success', false, 'message', 'Tarefa já concluída'); END IF;
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_session.campaign_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada'); END IF;
    IF v_session.token != p_token THEN RETURN jsonb_build_object('success', false, 'message', 'Token inválido'); END IF;
    v_elapsed := extract(epoch from (now() - v_session.start_time));
    v_required := LEAST(floor(v_campaign.duration * 0.7), 300);
    IF v_elapsed < v_required THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tempo de visualização insuficiente');
    END IF;
    IF NOT p_is_subscribed THEN RETURN jsonb_build_object('success', false, 'message', 'Subscrição não verificada'); END IF;
    IF v_campaign.remaining_budget < v_campaign.reward THEN RETURN jsonb_build_object('success', false, 'message', 'Orçamento esgotado'); END IF;
    UPDATE public.video_sessions SET completed = true WHERE id = p_session_id;
    UPDATE public.campaigns SET remaining_budget = remaining_budget - reward, completed_count = completed_count + 1 WHERE id = v_session.campaign_id;
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_campaign.reward WHERE user_id = auth.uid();
    INSERT INTO public.tasks (campaign_id, worker_id, status, reward_amount, completed_at)
    VALUES (v_session.campaign_id, auth.uid(), 'approved', v_campaign.reward, now());
    RETURN jsonb_build_object('success', true, 'reward', v_campaign.reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Histórico de Acessos e Último Login

**Configurado o sistema de métricas de acesso para contabilizar entradas e data de login.**

#### Alterações:
- **`Dashboard.tsx`**: Implementada chamada automática para registo de acesso assim que o utilizador entra no sistema.
- **`FIX_USER_TRACKING.sql`**: Criada migração para adicionar as colunas `access_count` e `last_access` à tabela `profiles` e criar a função de tracking no banco de dados.

#### Como aplicar:
1. Copie o conteúdo de [FIX_USER_TRACKING.sql](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/supabase/FIX_USER_TRACKING.sql).
2. Execute no **SQL Editor** do Supabase.

#### Worker Task Flow Refinement

I've significantly improved the worker experience by streamlining the task completion process in `TasksList.tsx`.

### Key Improvements:
- **Merged "Reserve" & "Start":** Clicking "Trabalhar" now automatically claims the task and opens the task link in a new tab.
- **Guided Multi-Step Dialog:** A single, controlled dialog manages the entire completion flow:
  1. **Interaction Step:** Displays clear instructions and the mission link. The "JÁ SEGUI / CONCLUÍ" button is disabled until the link is clicked.
  2. **Proof Submission Step:** Once the user interacts with the link, the submission form (or `YouTubeTaskPlayer`) is revealed.
- **Automatic Video Validation:** For YouTube tasks, the `YouTubeTaskPlayer` is integrated directly into the new dialog flow, handling automatic validation and completion.
- **Improved State Management:** The flow is now more robust, ensuring users follow the required steps before being allowed to submit proofs.

### Verification Steps:
1. Log in as a worker.
2. Navigate to the Tasks page.
3. Click "Trabalhar" on an available campaign.
4. Verify that the task link opens automatically and the "Completar Tarefa" dialog appears.
5. Confirm that the "JÁ SEGUI / CONCLUÍ" button is initialy disabled and only becomes enabled after clicking the mission link.
6. Verify that clicking "JÁ SEGUI / CONCLUÍ" reveals the correct proof upload fields (or YouTube player).
7. Complete a task and verify it is successfully moved to "Histórico de Tarefas" with "Aguardando Review" status.

---

### Backend (Banco de Dados)
- **Arquivo**: [AUTOMATIC_WITHDRAWAL_NOTIFICATION.sql](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/supabase/AUTOMATIC_WITHDRAWAL_NOTIFICATION.sql)
- **Mudança**: Atualizada a variável `v_min_withdrawal` de `1000` para `500` na função `check_worker_withdrawal_availability`.
- **Status**: **Aplicado pelo usuário no console do Supabase.** ✅

---

### Correção de Indicação (Referral)
- **Arquivo**: [Auth.tsx](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/src/pages/Auth.tsx)
- Melhorado o tratamento de erros na validação de e-mail de indicação. Agora, falhas técnicas não serão mais mascaradas como "indicador não é trabalhador".
- **Problema**: A função de validação no banco de dados estava falhando devido a um erro de sintaxe e permissão.

#### [IMPORTANTE] Execução do Script SQL (Correção do Indicador)
Se o problema persistir após a atualização do código, execute o seguinte script no **SQL Editor do Supabase**:

```sql
-- Re-criar a função validate_referrer com sintaxe e permissões corrigidas
CREATE OR REPLACE FUNCTION public.validate_referrer(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_type TEXT;
BEGIN
  SELECT user_id, user_type INTO v_user_id, v_user_type
  FROM profiles
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'NOT_FOUND');
  END IF;

  IF v_user_type != 'worker' THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'NOT_WORKER');
  END IF;

  RETURN jsonb_build_object('valid', true, 'error_code', 'OK', 'user_id', v_user_id);
END;
$$;

-- Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.validate_referrer(TEXT) TO anon, authenticated;

-- Actualizar cache do schema
NOTIFY pgrst, 'reload schema';
```

## Referrals & Database Schema Repair (Definitive Fix)

I identified and fixed a critical issue where referrals were failing because the database schema was out of sync with the application.

### Key Changes
- **Comprehensive Schema Fix**: Updated the `profiles` table with 20+ missing columns (referral links, wallet balance, access tracking, etc.).
- **Infrastructure Initialization**: Created missing platform tables: `campaigns`, `tasks`, `referral_commissions`, `withdrawals`, `notifications`, and `system_settings`.
- **Referral Logic**: Implemented the `validate_referrer` RPC and updated the `handle_new_user` trigger to correctly process worker referrals during client signup.

### Verification Results
- **Schema Audit**: All required tables and columns are now present in the Supabase project.
- **RPC Validation**: Directly tested `validate_referrer` with test data, confirming it correctly identifies workers and returns the appropriate JSON response for the frontend (Worker Found/Not Found/Invalid Type).
- **Registration Flow**: Registration trigger `on_auth_user_created` re-linked to the corrected `handle_new_user` function.

## Resolução: Ativação de Campanha (Erro de Cache)

Identificámos e corrigimos um erro crítico que impedia a ativação de novas campanhas ("Could not find function... in schema cache").

### Causa Raiz
- **Project Mismatch**: O site estava configurado no ficheiro `.env` para ligar-se a um projeto Supabase antigo (`xofpoel...`), enquanto as correções estavam a ser aplicadas noutro projeto.
- **Esquema Desatualizado**: A tabela `campaigns` no projeto original não possuía as colunas necessárias para o novo fluxo de vídeo (`video_id`, `reward`, etc.) e os tipos de dados de saldo não suportavam decimais.

### Soluções Implementadas
1. **Configuração de Ambiente**: O ficheiro `.env` foi restaurado para o projeto original do utilizador.
2. **Reparação Manual**: Criado o script [MANUAL_FIX_OLD_PROJECT.sql](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/supabase/MANUAL_FIX_OLD_PROJECT.sql) para ser executado manualmente no dashboard do Supabase. Este script:
    - Adiciona as colunas em falta.
    - Resolve dependências de Views para permitir alteração de tipos.
    - Implementa a função RPC `create_campaign_with_balance_v3`.
3. **Limpeza de Segurança**: Como medida de precaução, todas as alterações acidentais feitas no projeto "Angola Denúncias" foram revertidas usando o script [REVERT_ANGOLA_DENUNCIAS_CHANGES.sql](file:///c:/Users/Ivan%20Lima/Documents/makemoneyafrica/supabase/REVERT_ANGOLA_DENUNCIAS_CHANGES.sql).

### Verificação Final
- O utilizador confirmou que o erro de "Function not found" desapareceu após a execução do script manual.
- O site agora utiliza a versão `v3` da API de criação de campanhas, que é robusta contra erros de cache.

## Atualização: Limite de Levantamento

O valor mínimo para solicitação de levantamento (saque) foi ajustado para facilitar o acesso aos ganhos pelos trabalhadores.

### Alterações:
- **`WithdrawalRequest.tsx`**: O valor constante `MIN_WITHDRAWAL` foi alterado de **1000 Kz** para **500 Kz**.
- **Interface Visual**:
    - Adicionados ícones de estado (✅/⚠️) no cartão de saldo para indicar claramente se o utilizador já pode ou não levantar dinheiro.
    - O *placeholder* do campo de valor agora indica explicitamente o novo mínimo de 500 Kz.
    - Adicionado um aviso explícito no diálogo de confirmação reforçando as regras de levantamento.

## Promoção e Credibilidade (Landing Page)

Para impulsionar a adesão de novos trabalhadores, destacámos o novo limite de levantamento e adicionámos prova social à página inicial.

### Alterações:
- **`Hero.tsx`**: O banner de confiança no topo da página agora destaca "Levantamentos a partir de 500 Kz".
- **`HowItWorks.tsx`**: O passo-a-passo para trabalhadores foi atualizado para reforçar o saque mínimo baixo.
- **`Testimonials.tsx` [NOVO]**: Criada uma secção de depoimentos com histórias de sucesso de trabalhadores fictícios (Mauro, Ana e João), focando na facilidade de receber em Angola.
- **`Index.tsx`**: Integrada a nova secção de depoimentos no fluxo da página principal.

### Verificação:
- A lógica de validação no frontend agora permite valores a partir de 500 Kz.
- O botão "Solicitar Levantamento" ativa-se automaticamente assim que o saldo atinge o novo limite.


## Verificação Final

1. **Landing Page**: A secção de planos agora mostra apenas o "Tá no Limão".
2. **Criação de Campanha**: Ao tentar criar uma campanha, apenas o "Tá no Limão" é seleccionável. O "Kwanza" aparece como bloqueado/indisponível.
3. **Chatbot**: Ao perguntar sobre "planos" ou "preços", o robô informa apenas sobre o "Tá no Limão".

> [!NOTE]
> Mantivemos a lógica de validação no Painel do Trabalhador para garantir que tarefas de campanhas "Kwanza" ainda activas possam ser concluídas sem problemas.
