-- TEMPORARY BAN SYSTEM WITH ESCALATION
-- 1. Add necessary columns to chat_moderation
ALTER TABLE public.chat_moderation 
ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ban_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ban_time TIMESTAMPTZ;

-- 2. Create RPC function for temporary banning
CREATE OR REPLACE FUNCTION public.ban_user_temporary(target_user_id UUID, admin_id UUID, ban_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_ban_time TIMESTAMPTZ;
    v_ban_count INT;
    v_duration INTERVAL;
    v_new_ban_count INT;
    v_banned_until TIMESTAMPTZ;
BEGIN
    -- Get current ban info
    SELECT last_ban_time, ban_count 
    INTO v_last_ban_time, v_ban_count
    FROM public.chat_moderation
    WHERE user_id = target_user_id;

    -- Initialize if null
    IF v_last_ban_time IS NULL THEN
        v_last_ban_time := '-infinity'::TIMESTAMPTZ;
        v_ban_count := 0;
    END IF;

    -- Check if last ban was within 1 hour
    IF (EXTRACT(EPOCH FROM (NOW() - v_last_ban_time)) < 3600) THEN
        -- Escalation logic: Multiply time by 2
        -- Base is 5 minutes. 
        -- Count 0 (1st ban) -> 5 mins
        -- Count 1 (2nd ban) -> 10 mins
        -- Count 2 (3rd ban) -> 20 mins
        v_new_ban_count := v_ban_count + 1;
        v_duration := '5 minutes'::INTERVAL * (2 ^ v_ban_count); -- 2^0=1(5m), 2^1=2(10m), 2^2=4(20m)
    ELSE
        -- Reset logic
        v_new_ban_count := 1;
        v_duration := '5 minutes'::INTERVAL;
    END IF;

    v_banned_until := NOW() + v_duration;

    -- Update/Insert record
    INSERT INTO public.chat_moderation (user_id, is_banned, banned_until, ban_count, last_ban_time, reason, moderated_by, updated_at)
    VALUES (target_user_id, true, v_banned_until, v_new_ban_count, NOW(), ban_reason, admin_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET 
        is_banned = true,
        banned_until = EXCLUDED.banned_until,
        ban_count = EXCLUDED.ban_count,
        last_ban_time = EXCLUDED.last_ban_time,
        reason = EXCLUDED.reason,
        moderated_by = EXCLUDED.moderated_by,
        updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
        'success', true,
        'banned_until', v_banned_until,
        'duration_minutes', EXTRACT(EPOCH FROM v_duration) / 60
    );
END;
$$;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.ban_user_temporary TO authenticated;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
