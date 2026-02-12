CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE email = p_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon, authenticated;
