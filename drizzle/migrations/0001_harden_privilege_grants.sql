-- Least-privilege hardening. RLS already restricts every row; these REVOKEs
-- remove table privileges that no policy ever needs, so privilege-bearing
-- tables cannot be written from a client session under any circumstance.

-- No table has an anon policy: anon needs no privileges at all.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Access-control tables: read-only for signed-in users, writes are backend-only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_entitlements FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.coaching_report_grants FROM authenticated;

-- Append-only / no-delete tables, matching their existing policies.
REVOKE UPDATE, DELETE ON public.beta_events FROM authenticated;
REVOKE DELETE ON public.feedback_reports FROM authenticated;
REVOKE DELETE ON public.profiles FROM authenticated;

-- Backend keeps full access for administration and metering.
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.user_entitlements TO service_role;
GRANT ALL ON public.coaching_report_grants TO service_role;

COMMENT ON TABLE public.user_roles IS
  'Server-authorized roles (admin/moderator/user/owner). Signed-in users may read only their own rows; all writes require the service role. Owner access is granted here and nowhere else.';

COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'SECURITY DEFINER by design: RLS policies must read user_roles, which signed-in users can only self-read. The body restricts any authenticated caller to _user_id = auth.uid(), so it can only confirm the caller''s own role and cannot enumerate others. EXECUTE is revoked from PUBLIC and anon.';