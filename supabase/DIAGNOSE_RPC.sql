-- Execute este script para listar todas as funções RPC criadas e verificar se delete_user existe

SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%delete_user%'
ORDER BY p.proname;

-- Teste de existência com tentativa de execução (com ID falso)
-- Se retornar erro "function does not exist", então realmente não foi criada.
-- Se retornar "ID inválido" (do nosso código v3), então ELA EXISTE!

SELECT public.delete_user_v3('00000000-0000-0000-0000-000000000000');
