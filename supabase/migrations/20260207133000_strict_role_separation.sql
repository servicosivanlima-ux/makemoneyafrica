-- Migration para separar estritamente papéis de Admin e Cliente/Trabalhador

-- 1. Permitir 'admin' no tipo de usuário na tabela profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IN ('client', 'worker', 'admin'));

-- 2. Atualizar perfis de administradores para o tipo 'admin'
-- Identifica usuários que têm a role 'admin' e atualiza seu perfil
UPDATE public.profiles
SET user_type = 'admin'
WHERE user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
);

-- 3. Remover roles conflitantes (client/worker) de usuários que são admin
-- Isso garante que um admin não seja tratado como cliente ou trabalhador
DELETE FROM public.user_roles
WHERE user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
) AND role != 'admin';

-- 4. Forçar recarregamento do schema para garantir que novas constraints sejam aplicadas
NOTIFY pgrst, 'reload schema';
