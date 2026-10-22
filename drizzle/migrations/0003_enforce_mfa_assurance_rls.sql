CREATE OR REPLACE FUNCTION public.session_meets_mfa()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT coalesce(auth.jwt()->>'aal','aal1') = 'aal2'
    OR NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = auth.uid() AND f.status = 'verified')
$$;
REVOKE ALL ON FUNCTION public.session_meets_mfa() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.session_meets_mfa() TO authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['coaching_analyses','coaching_report_grants','feedback_reports','matches','profiles','riot_accounts','subscriptions','user_entitlements'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Require MFA when enrolled" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Require MFA when enrolled" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.session_meets_mfa()) WITH CHECK (public.session_meets_mfa())', t);
  END LOOP;
END $$;