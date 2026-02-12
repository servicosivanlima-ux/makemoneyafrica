-- FIX ADMIN MODERATION PERMISSIONS
-- This script ensures admins can delete messages and manage bans/mutes.

-- 1. ADVICE: Grant DELETE on chat_messages
GRANT DELETE ON TABLE public.chat_messages TO authenticated;

-- 2. RLS Policy for Deleting Messages (Admins Only)
DROP POLICY IF EXISTS "Admins can delete messages" ON public.chat_messages;
CREATE POLICY "Admins can delete messages"
    ON public.chat_messages FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Ensure Chat Moderation Table is Writable
GRANT ALL ON TABLE public.chat_moderation TO authenticated;
GRANT ALL ON TABLE public.chat_moderation TO service_role;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
