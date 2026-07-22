-- Drop all policies from both tables to clear dependencies
DROP POLICY IF EXISTS "Users can view their own support conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can update their own support conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can insert their own support conversations" ON public.support_conversations;

DROP POLICY IF EXISTS "Users can view messages of their own conversations" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert messages into their own conversations" ON public.support_messages;

-- Alter user_id type in support_conversations
ALTER TABLE public.support_conversations ALTER COLUMN user_id TYPE VARCHAR(255);

-- Recreate policies for support_conversations with text casting for auth.uid()
CREATE POLICY "Users can view their own support conversations" 
ON public.support_conversations 
FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own support conversations" 
ON public.support_conversations 
FOR UPDATE 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own support conversations" 
ON public.support_conversations 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Recreate policies for support_messages with text casting for auth.uid()
CREATE POLICY "Users can view messages of their own conversations" 
ON public.support_messages 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.support_conversations 
        WHERE support_conversations.id = support_messages.conversation_id 
        AND support_conversations.user_id = auth.uid()::text
    )
);

CREATE POLICY "Users can insert messages into their own conversations" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_conversations 
        WHERE support_conversations.id = support_messages.conversation_id 
        AND support_conversations.user_id = auth.uid()::text
    ) AND sender_type = 'user'
);
