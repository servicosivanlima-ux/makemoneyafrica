-- Adicionar restrição UNIQUE à coluna phone para evitar contactos duplicados
-- Se houver duplicados, o comando falhará, alertando o administrador.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
