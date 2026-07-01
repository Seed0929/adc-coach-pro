CREATE TABLE public.riot_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_name text NOT NULL,
  tag_line text NOT NULL,
  region text NOT NULL,
  puuid text,
  account_id text,
  summoner_id text,
  profile_icon_id integer,
  summoner_level integer,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_sync timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.riot_accounts TO authenticated;
GRANT ALL ON public.riot_accounts TO service_role;

ALTER TABLE public.riot_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own riot account"
  ON public.riot_accounts FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own riot account"
  ON public.riot_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own riot account"
  ON public.riot_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own riot account"
  ON public.riot_accounts FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

CREATE TRIGGER update_riot_accounts_updated_at
  BEFORE UPDATE ON public.riot_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();