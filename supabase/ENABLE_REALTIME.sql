-- ACTIVA O REALTIME PARA AS TABELAS PRINCIPAIS
-- Executa este script no SQL Editor do Supabase para garantir que as mudanças no banco sejam enviadas para o frontend instantaneamente.

-- 1. Garante que a publicação 'supabase_realtime' existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Adiciona as tabelas à publicação de Realtime
-- Nota: Algumas podem já estar lá, o Supabase ignora se já existirem.
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE kyc_documents;

-- 3. Garante que as tabelas têm REPLICA IDENTITY FULL (necessário para ver valores antigos em updates, opcional mas recomendado)
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE campaigns REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE withdrawals REPLICA IDENTITY FULL;
ALTER TABLE deposits REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE kyc_documents REPLICA IDENTITY FULL;
