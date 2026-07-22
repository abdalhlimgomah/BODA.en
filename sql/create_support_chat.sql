-- Create support_conversations table
CREATE TABLE IF NOT EXISTS public.support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name VARCHAR(255) DEFAULT '',
    user_email VARCHAR(255) DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
    last_message TEXT DEFAULT '',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_user_count INTEGER DEFAULT 0,
    unread_admin_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('user', 'admin')),
    message TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own support conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can update their own support conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can insert their own support conversations" ON public.support_conversations;

DROP POLICY IF EXISTS "Users can view messages of their own conversations" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert messages into their own conversations" ON public.support_messages;

-- Create policies for support_conversations
-- Users can only see their own conversations (matching their auth.uid())
CREATE POLICY "Users can view their own support conversations" 
ON public.support_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own support conversations" 
ON public.support_conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own support conversations" 
ON public.support_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for support_messages
-- Users can only see messages belonging to their conversations
CREATE POLICY "Users can view messages of their own conversations" 
ON public.support_messages 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.support_conversations 
        WHERE support_conversations.id = support_messages.conversation_id 
        AND support_conversations.user_id = auth.uid()
    )
);

-- Users can only insert messages into their own conversations
CREATE POLICY "Users can insert messages into their own conversations" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_conversations 
        WHERE support_conversations.id = support_messages.conversation_id 
        AND support_conversations.user_id = auth.uid()
    ) AND sender_type = 'user'
);

-- Enable Realtime for support_messages and support_conversations
alter table public.support_messages replica identity full;
alter table public.support_conversations replica identity full;

-- Add to publication if not already present
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'support_conversations'
  ) then
    alter publication supabase_realtime add table public.support_conversations;
  end if;
end $$;
