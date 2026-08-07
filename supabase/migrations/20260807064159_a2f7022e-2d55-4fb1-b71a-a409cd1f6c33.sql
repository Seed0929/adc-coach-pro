CREATE TABLE public.beta_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES auth.users ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  stage TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX beta_events_created_at_idx ON public.beta_events (created_at DESC);
CREATE INDEX beta_events_profile_idx ON public.beta_events (profile_id, created_at DESC);

GRANT SELECT, INSERT ON public.beta_events TO authenticated;
GRANT ALL ON public.beta_events TO service_role;

ALTER TABLE public.beta_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record their own journey events"
  ON public.beta_events FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can read their own journey events"
  ON public.beta_events FOR SELECT TO authenticated
  USING (profile_id = auth.uid());