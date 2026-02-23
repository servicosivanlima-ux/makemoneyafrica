-- FIX_VALIDATE_REFERRER.sql
-- Re-create the validate_referrer function with correct syntax and permissions.

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

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.validate_referrer(TEXT) TO anon, authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
