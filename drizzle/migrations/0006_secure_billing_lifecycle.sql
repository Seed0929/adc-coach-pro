CREATE TABLE public.billing_customers (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 environment text NOT NULL CHECK (environment IN ('sandbox','live')),
 stripe_customer_id text,
 checkout_key uuid NOT NULL DEFAULT gen_random_uuid(),
 checkout_session_id text,
 checkout_expires_at timestamptz,
 checkout_cycle text CHECK (checkout_cycle IN ('monthly','annual')),
 PRIMARY KEY(user_id,environment), UNIQUE(environment,stripe_customer_id)
);
GRANT ALL ON public.billing_customers TO service_role;
REVOKE ALL ON public.billing_customers FROM anon,authenticated;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MFA for billing mapping" ON public.billing_customers AS RESTRICTIVE FOR ALL TO authenticated USING (public.session_meets_mfa()) WITH CHECK (public.session_meets_mfa());
CREATE TABLE public.billing_webhook_receipts (
 environment text NOT NULL CHECK(environment IN ('sandbox','live')),
 event_id text NOT NULL,
 event_created bigint NOT NULL,
 subscription_id text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(environment,event_id)
);
GRANT ALL ON public.billing_webhook_receipts TO service_role;
REVOKE ALL ON public.billing_webhook_receipts FROM anon,authenticated;
ALTER TABLE public.billing_webhook_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MFA for webhook receipts" ON public.billing_webhook_receipts AS RESTRICTIVE FOR ALL TO authenticated USING (public.session_meets_mfa()) WITH CHECK (public.session_meets_mfa());
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_event_created bigint NOT NULL DEFAULT 0;
CREATE FUNCTION public.reserve_billing_checkout(p_user uuid,p_env text,p_cycle text)
RETURNS public.billing_customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.billing_customers;
BEGIN
 IF p_env <> 'sandbox' OR p_cycle NOT IN ('monthly','annual') THEN RAISE EXCEPTION 'Test checkout only'; END IF;
 INSERT INTO public.billing_customers(user_id,environment) VALUES(p_user,p_env) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM public.billing_customers WHERE user_id=p_user AND environment=p_env FOR UPDATE;
 IF r.checkout_expires_at IS NOT NULL AND r.checkout_expires_at>now() THEN
   IF r.checkout_cycle<>p_cycle THEN RAISE EXCEPTION 'An existing checkout must expire before changing billing cycle'; END IF;
   RETURN r;
 END IF;
 UPDATE public.billing_customers SET checkout_key=gen_random_uuid(),checkout_cycle=p_cycle,checkout_session_id=NULL,checkout_expires_at=now()+interval '31 minutes' WHERE user_id=p_user AND environment=p_env RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.reserve_billing_checkout(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_billing_checkout(uuid,text,text) TO service_role;
CREATE FUNCTION public.apply_billing_subscription(p_env text,p_event_id text,p_created bigint,p_row jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old public.subscriptions; mapped uuid;
BEGIN
 IF p_env NOT IN ('sandbox','live') OR p_event_id !~ '^evt_' OR p_created<=0 THEN RAISE EXCEPTION 'Invalid billing event'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_env||':'||(p_row->>'stripe_subscription_id'),0));
 IF EXISTS(SELECT 1 FROM public.billing_webhook_receipts WHERE environment=p_env AND event_id=p_event_id) THEN RETURN 'duplicate'; END IF;
 SELECT user_id INTO mapped FROM public.billing_customers WHERE environment=p_env AND stripe_customer_id=p_row->>'stripe_customer_id';
 IF mapped IS NULL OR mapped::text<>p_row->>'user_id' THEN RAISE EXCEPTION 'Customer ownership mismatch'; END IF;
 SELECT * INTO old FROM public.subscriptions WHERE stripe_subscription_id=p_row->>'stripe_subscription_id' FOR UPDATE;
 IF FOUND AND (old.user_id<>mapped OR old.environment<>p_env OR old.stripe_customer_id<>p_row->>'stripe_customer_id') THEN RAISE EXCEPTION 'Subscription ownership mismatch'; END IF;
 IF old.id IS NOT NULL AND (old.last_event_created>p_created OR (old.status='canceled' AND p_row->>'status'<>'canceled')) THEN
  INSERT INTO public.billing_webhook_receipts(environment,event_id,event_created,subscription_id) VALUES(p_env,p_event_id,p_created,p_row->>'stripe_subscription_id');
  RETURN 'stale';
 END IF;
 IF p_row->>'price_id' NOT IN ('pro_monthly','pro_yearly') THEN RAISE EXCEPTION 'Unsupported price'; END IF;
 INSERT INTO public.subscriptions(user_id,stripe_subscription_id,stripe_customer_id,product_id,price_id,status,current_period_start,current_period_end,cancel_at_period_end,environment,last_event_created,updated_at)
 VALUES(mapped,p_row->>'stripe_subscription_id',p_row->>'stripe_customer_id',p_row->>'product_id',p_row->>'price_id',p_row->>'status',(p_row->>'current_period_start')::timestamptz,(p_row->>'current_period_end')::timestamptz,(p_row->>'cancel_at_period_end')::boolean,p_env,p_created,now())
 ON CONFLICT(stripe_subscription_id) DO UPDATE SET price_id=EXCLUDED.price_id,product_id=EXCLUDED.product_id,status=EXCLUDED.status,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,cancel_at_period_end=EXCLUDED.cancel_at_period_end,last_event_created=EXCLUDED.last_event_created,updated_at=now();
 INSERT INTO public.billing_webhook_receipts(environment,event_id,event_created,subscription_id) VALUES(p_env,p_event_id,p_created,p_row->>'stripe_subscription_id');
 RETURN 'applied';
END $$;
REVOKE ALL ON FUNCTION public.apply_billing_subscription(text,text,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_subscription(text,text,bigint,jsonb) TO service_role;