-- Grant permissions to authenticated users
GRANT ALL ON TABLE public.chat_messages TO postgres;
GRANT ALL ON TABLE public.chat_messages TO service_role;
GRANT SELECT, INSERT ON TABLE public.chat_messages TO authenticated;

-- Grant permissions for other chat tables
GRANT SELECT ON TABLE public.chat_forbidden_words TO authenticated;
GRANT SELECT ON TABLE public.chat_moderation TO authenticated;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
