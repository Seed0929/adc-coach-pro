CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  match_id TEXT NOT NULL,
  puuid TEXT NOT NULL,
  queue_id INTEGER,
  queue_label TEXT,
  champion_name TEXT NOT NULL,
  champion_id INTEGER,
  win BOOLEAN NOT NULL DEFAULT false,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  cs INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 0,
  vision_score INTEGER,
  team_position TEXT,
  game_duration INTEGER NOT NULL DEFAULT 0,
  game_creation TIMESTAMP WITH TIME ZONE,
  raw JSONB,
  timeline JSONB,
  timeline_fetched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (profile_id, match_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert their own matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own matches"
  ON public.matches FOR DELETE
  USING (auth.uid() = profile_id);

CREATE INDEX idx_matches_profile_created ON public.matches (profile_id, game_creation DESC);

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();