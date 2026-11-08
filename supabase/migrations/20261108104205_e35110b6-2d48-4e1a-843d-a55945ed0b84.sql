REVOKE EXECUTE ON FUNCTION public.messages_validate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_conversation(uuid) FROM PUBLIC, anon;