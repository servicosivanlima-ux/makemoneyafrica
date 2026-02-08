-- Run this command in the Supabase SQL Editor to refresh the API schema cache
-- This fixes the error: "Could not find the table 'public.chat_messages' in the schema cache"

NOTIFY pgrst, 'reload schema';
