CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  customer_name text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  last_message text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  customer_last_read timestamptz NOT NULL DEFAULT now(),
  shop_last_read timestamptz NOT NULL DEFAULT '1970-01-01',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv read" ON public.conversations FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_shop_owner(shop_id));
CREATE POLICY "conv customer insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND public.shop_is_public(shop_id) AND NOT public.is_shop_owner(shop_id));
CREATE POLICY "conv update" ON public.conversations FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.is_shop_owner(shop_id))
  WITH CHECK (customer_id = auth.uid() OR public.is_shop_owner(shop_id));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_conversation(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM conversations c WHERE c.id = _id
    AND (c.customer_id = auth.uid() OR public.is_shop_owner(c.shop_id)));
$$;
CREATE POLICY "msg read" ON public.messages FOR SELECT TO authenticated
  USING (public.can_access_conversation(conversation_id));
CREATE POLICY "msg insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_conversation(conversation_id));

CREATE OR REPLACE FUNCTION public.messages_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.body := btrim(NEW.body);
  IF length(NEW.body) = 0 OR length(NEW.body) > 2000 THEN RAISE EXCEPTION 'invalid message'; END IF;
  NEW.created_at := now();
  UPDATE conversations SET last_message = left(NEW.body, 200), last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_validate_trg BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_validate();