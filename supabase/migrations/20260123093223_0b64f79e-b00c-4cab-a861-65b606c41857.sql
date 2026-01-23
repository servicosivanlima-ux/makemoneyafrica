-- Create function to handle new user registration
-- This creates a profile and assigns the appropriate role automatically

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_type text;
  _role app_role;
BEGIN
  -- Extract user type from metadata
  _user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  
  -- Map user_type to app_role
  _role := CASE 
    WHEN _user_type = 'worker' THEN 'worker'::app_role
    ELSE 'client'::app_role
  END;
  
  -- Create profile with data from auth metadata
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    phone,
    user_type,
    account_type,
    company_name,
    withdrawal_method,
    withdrawal_details,
    facebook_link,
    instagram_link,
    tiktok_link,
    youtube_link
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    _user_type,
    NEW.raw_user_meta_data->>'account_type',
    NEW.raw_user_meta_data->>'page_name',
    NEW.raw_user_meta_data->>'withdraw_method',
    CASE 
      WHEN NEW.raw_user_meta_data->>'withdraw_method' = 'iban' 
      THEN CONCAT(NEW.raw_user_meta_data->'social_links'->>'iban_bank', ' - ', NEW.raw_user_meta_data->'social_links'->>'iban_number')
      ELSE NEW.raw_user_meta_data->'social_links'->>'multicaixa_number'
    END,
    NEW.raw_user_meta_data->'social_links'->>'facebook',
    NEW.raw_user_meta_data->'social_links'->>'instagram',
    NEW.raw_user_meta_data->'social_links'->>'tiktok',
    NEW.raw_user_meta_data->'social_links'->>'youtube'
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create secure admin functions for server-side validation

-- Function to approve a campaign payment (admin only)
CREATE OR REPLACE FUNCTION public.admin_approve_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Update campaign status
  UPDATE campaigns
  SET status = 'active', payment_confirmed_at = now(), updated_at = now()
  WHERE id = p_campaign_id AND status = 'pending_payment';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to reject a campaign (admin only)
CREATE OR REPLACE FUNCTION public.admin_reject_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE campaigns
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_campaign_id AND status = 'pending_payment';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to approve a task (admin only)
CREATE OR REPLACE FUNCTION public.admin_approve_task(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Get campaign_id and update task
  UPDATE tasks
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_task_id AND status = 'pending_review'
  RETURNING campaign_id INTO v_campaign_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or already processed';
  END IF;
  
  -- Increment campaign completed count
  UPDATE campaigns
  SET completed_count = COALESCE(completed_count, 0) + 1, updated_at = now()
  WHERE id = v_campaign_id;
  
  RETURN true;
END;
$$;

-- Function to reject a task (admin only)
CREATE OR REPLACE FUNCTION public.admin_reject_task(p_task_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE tasks
  SET status = 'rejected', rejection_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_task_id AND status = 'pending_review';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to approve a withdrawal (admin only)
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_withdrawal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE withdrawals
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to reject a withdrawal (admin only)
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_withdrawal_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE withdrawals
  SET status = 'rejected', rejection_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to create a campaign with server-side validation
CREATE OR REPLACE FUNCTION public.create_campaign_secure(
  p_plan_type text,
  p_plan_name text,
  p_platform text,
  p_page_link text,
  p_profile_link text DEFAULT NULL,
  p_video_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
  v_price integer;
  v_target_count integer;
  v_user_type text;
BEGIN
  -- Verify user is a client
  SELECT user_type INTO v_user_type 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF v_user_type != 'client' THEN
    RAISE EXCEPTION 'Only clients can create campaigns';
  END IF;
  
  -- Validate plan type
  IF p_plan_type NOT IN ('ta_no_limao', 'kwanza') THEN
    RAISE EXCEPTION 'Invalid plan type';
  END IF;
  
  -- Validate platform
  IF p_platform NOT IN ('facebook', 'instagram', 'tiktok', 'youtube') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;
  
  -- Validate page link
  IF p_page_link IS NULL OR LENGTH(TRIM(p_page_link)) < 10 THEN
    RAISE EXCEPTION 'Invalid page link';
  END IF;
  
  -- Server-side price lookup to prevent client manipulation
  IF p_plan_type = 'ta_no_limao' THEN
    CASE p_plan_name
      WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
      WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
      WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
      WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
      WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
      WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
      WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
      ELSE RAISE EXCEPTION 'Invalid plan name for Tá no Limão';
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
      ELSE RAISE EXCEPTION 'Invalid plan name for Kwanza';
    END CASE;
  END IF;
  
  -- Check for existing pending campaigns
  IF EXISTS (
    SELECT 1 FROM campaigns 
    WHERE client_id = auth.uid() 
    AND status = 'pending_payment'
  ) THEN
    RAISE EXCEPTION 'You already have a pending campaign';
  END IF;
  
  -- Insert campaign with validated data
  INSERT INTO campaigns (
    client_id,
    plan_type,
    plan_name,
    platform,
    page_link,
    profile_link,
    video_link,
    target_count,
    price,
    status
  ) VALUES (
    auth.uid(),
    p_plan_type::plan_type,
    p_plan_name,
    p_platform::platform_type,
    p_page_link,
    p_profile_link,
    p_video_link,
    v_target_count,
    v_price,
    'pending_payment'::campaign_status
  ) RETURNING id INTO v_campaign_id;
  
  RETURN v_campaign_id;
END;
$$;