-- Security fix: prevent arbitrary users from inserting themselves into private conversations.
-- Conversation membership must be created by the trusted conversation-creation/invite flows.

drop policy if exists message_members_insert on public.message_conversation_members;

create policy message_members_insert
on public.message_conversation_members
for insert
to authenticated
with check (false);
