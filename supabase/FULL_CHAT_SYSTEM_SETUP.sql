-- FULL CHAT SYSTEM SETUP
-- Run this entire script in the Supabase SQL Editor to initialize the chat system.

-- 1. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create chat_forbidden_words table
CREATE TABLE IF NOT EXISTS public.chat_forbidden_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create chat_moderation table (bans and mutes)
CREATE TABLE IF NOT EXISTS public.chat_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    is_banned BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    reason TEXT,
    moderated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_forbidden_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_moderation ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for chat_messages
DROP POLICY IF EXISTS "Anyone authenticated can read messages" ON public.chat_messages;
CREATE POLICY "Anyone authenticated can read messages"
    ON public.chat_messages FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Non-moderated users can send messages" ON public.chat_messages;
CREATE POLICY "Non-moderated users can send messages"
    ON public.chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
            AND NOT EXISTS (
                SELECT 1 FROM public.chat_moderation m
                WHERE m.user_id = auth.uid()
                AND (m.is_banned = true OR m.is_muted = true)
            )
        )
    );

-- 6. RLS Policies for chat_forbidden_words
DROP POLICY IF EXISTS "Anyone can read forbidden words" ON public.chat_forbidden_words;
CREATE POLICY "Anyone can read forbidden words"
    ON public.chat_forbidden_words FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Only admins can manage forbidden words" ON public.chat_forbidden_words;
CREATE POLICY "Only admins can manage forbidden words"
    ON public.chat_forbidden_words FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 7. RLS Policies for chat_moderation
DROP POLICY IF EXISTS "Admins full access to moderation" ON public.chat_moderation;
CREATE POLICY "Admins full access to moderation"
    ON public.chat_moderation FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can see their own moderation status" ON public.chat_moderation;
CREATE POLICY "Users can see their own moderation status"
    ON public.chat_moderation FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 8. Content Validation Function
CREATE OR REPLACE FUNCTION public.fn_validate_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    forbidden_count INTEGER;
BEGIN
    -- Block URLs/Links
    IF NEW.content ~* '(https?://|www\.|[a-z0-9]+\.[a-z]{2,})' THEN
        RAISE EXCEPTION 'O envio de links não é permitido no chat comunitário.';
    END IF;

    -- Block Forbidden Words
    SELECT COUNT(*) INTO forbidden_count
    FROM public.chat_forbidden_words
    WHERE NEW.content ILIKE '%' || word || '%';

    IF forbidden_count > 0 THEN
        RAISE EXCEPTION 'Sua mensagem contém termos proibidos e não pôde ser enviada.';
    END IF;

    -- Ensure it's marked as admin only if user IS admin
    IF NEW.is_admin = true THEN
       IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN
           NEW.is_admin := false;
       END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create Trigger
DROP TRIGGER IF EXISTS trg_validate_chat_message ON public.chat_messages;
CREATE TRIGGER trg_validate_chat_message
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_chat_message();

-- 10. Populate with some initial forbidden words
INSERT INTO public.chat_forbidden_words (word) VALUES 
('palavrão'), ('ofensa'), ('fraude'), ('golpe')
ON CONFLICT (word) DO NOTHING;

-- 11. GRANT PERMISSIONS (CRITICAL FIX)
GRANT ALL ON TABLE public.chat_messages TO postgres;
GRANT ALL ON TABLE public.chat_messages TO service_role;
GRANT SELECT, INSERT ON TABLE public.chat_messages TO authenticated;

GRANT SELECT ON TABLE public.chat_forbidden_words TO authenticated;
GRANT ALL ON TABLE public.chat_forbidden_words TO service_role;

GRANT SELECT ON TABLE public.chat_moderation TO authenticated;
GRANT ALL ON TABLE public.chat_moderation TO service_role;

-- 12. Force schema cache reload
NOTIFY pgrst, 'reload schema';
