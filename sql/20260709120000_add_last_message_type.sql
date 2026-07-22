-- Add last_message_type column to support_conversations (for file/image preview labels)
ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS last_message_type VARCHAR(50) NOT NULL DEFAULT 'text';
