-- Function to check worker balance and send notification when it reaches the minimum withdrawal amount
CREATE OR REPLACE FUNCTION public.check_worker_withdrawal_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_total_earned INTEGER;
  v_withdrawn_amount INTEGER;
  v_current_balance INTEGER;
  v_previous_balance INTEGER;
  v_min_withdrawal INTEGER := 500;
BEGIN
  -- Only trigger when a task is approved
  IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    
    -- Calculate total earned (approved tasks)
    SELECT COALESCE(SUM(reward_amount), 0)
    INTO v_total_earned
    FROM public.tasks
    WHERE worker_id = NEW.worker_id AND status = 'approved';
    
    -- Calculate withdrawn amount (approved or pending withdrawals)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_withdrawn_amount
    FROM public.withdrawals
    WHERE worker_id = NEW.worker_id AND status IN ('approved', 'pending');
    
    -- Calculate current and previous balance
    v_current_balance := v_total_earned - v_withdrawn_amount;
    v_previous_balance := v_current_balance - NEW.reward_amount;
    
    -- If current balance is above minimum and previous was below
    IF v_current_balance >= v_min_withdrawal AND v_previous_balance < v_min_withdrawal THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        NEW.worker_id,
        '💸 Saque Disponível!',
        'Parabéns! Você atingiu o valor mínimo de ' || v_min_withdrawal || ' Kz e já pode solicitar o seu saque no painel.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS tr_check_withdrawal_availability ON public.tasks;
CREATE TRIGGER tr_check_withdrawal_availability
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_worker_withdrawal_availability();

-- Grant necessary permissions (if anything extra is needed)
GRANT EXECUTE ON FUNCTION public.check_worker_withdrawal_availability() TO postgres;
GRANT EXECUTE ON FUNCTION public.check_worker_withdrawal_availability() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_worker_withdrawal_availability() TO service_role;
