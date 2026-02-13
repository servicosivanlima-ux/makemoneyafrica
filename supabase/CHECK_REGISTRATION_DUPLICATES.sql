-- Função para verificar duplicidade de dados sensíveis na tabela profiles e auth.users
CREATE OR REPLACE FUNCTION public.check_registration_duplicates(
  p_email text,
  p_phone text,
  p_nif text DEFAULT NULL,
  p_name text DEFAULT NULL
)
RETURNS TABLE (
  field_name text,
  is_duplicate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar Email na tabela auth.users (mestra)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    field_name := 'email';
    is_duplicate := true;
    RETURN NEXT;
  END IF;

  -- Verificar Telefone na tabela profiles
  IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = p_phone) THEN
    field_name := 'phone';
    is_duplicate := true;
    RETURN NEXT;
  END IF;

  -- Verificar NIF (se fornecido)
  IF p_nif IS NOT NULL AND p_nif <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE nif = p_nif) THEN
      field_name := 'nif';
      is_duplicate := true;
      RETURN NEXT;
    END IF;
  END IF;

  -- Verificar Nome (se fornecido) - Verifica tanto full_name quanto company_name
  IF p_name IS NOT NULL AND p_name <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE full_name = p_name OR company_name = p_name) THEN
      field_name := 'name';
      is_duplicate := true;
      RETURN NEXT;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_registration_duplicates(text, text, text, text) TO anon, authenticated;
