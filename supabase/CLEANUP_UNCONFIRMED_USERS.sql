-- CLEANUP: Deletar automaticamente contas não confirmadas após 24 horas
-- Este script configura uma tarefa agendada (cron) para manter o banco de dados limpo.

-- 1. Habilitar a extensão pg_cron (se o Supabase permitir no seu plano)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar a função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_unconfirmed_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Deleta usuários que não confirmaram e-mail em 1 hora
  DELETE FROM auth.users
  WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '1 hour';
    
  -- Opcional: Registrar no log se desejar
  -- RAISE NOTICE 'Limpeza de usuários não confirmados executada.';
END;
$$;

-- 3. Agendar a tarefa para rodar todos os dias às 03:00 da manhã
-- Nota: Se o job já existir, ele será atualizado/ignorado dependendo da versão. 
-- No Supabase, recomendamos usar cron.unschedule primeiro se quiser resetar.
SELECT cron.unschedule('cleanup-unconfirmed-accounts');
SELECT cron.schedule(
  'cleanup-unconfirmed-accounts',
  '0 3 * * *', -- Diariamente às 03:00
  'SELECT public.cleanup_unconfirmed_users();'
);

-- Permissões
GRANT EXECUTE ON FUNCTION public.cleanup_unconfirmed_users() TO service_role;
