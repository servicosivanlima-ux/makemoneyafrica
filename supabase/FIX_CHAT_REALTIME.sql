-- ENABLE REALTIME FOR CHAT
-- This is critical for messages to appear instantly.

begin;
  -- remove the supabase_realtime publication
  drop publication if exists supabase_realtime;

  -- re-create the supabase_realtime publication with no tables
  create publication supabase_realtime;
commit;

-- add tables to the publication
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.notifications;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
