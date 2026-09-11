CREATE TYPE public.billing_plan AS ENUM ('free', 'pro');

CREATE TABLE public.user_entitlements (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.billing_plan NOT NULL DEFAULT 'free',
  source TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan"
  ON public.user_entitlements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.coaching_report_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX coaching_report_grants_user_period_idx
  ON public.coaching_report_grants (user_id, period_start);

GRANT SELECT ON public.coaching_report_grants TO authenticated;
GRANT ALL ON public.coaching_report_grants TO service_role;

ALTER TABLE public.coaching_report_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coaching report grants"
  ON public.coaching_report_grants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);