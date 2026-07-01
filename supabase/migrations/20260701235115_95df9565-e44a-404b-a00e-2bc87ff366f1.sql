CREATE TABLE public.coaching_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  engine_version INTEGER NOT NULL DEFAULT 1,
  overall_score INTEGER NOT NULL DEFAULT 0,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (profile_id, match_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_analyses TO authenticated;
GRANT ALL ON public.coaching_analyses TO service_role;

ALTER TABLE public.coaching_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coaching analyses" ON public.coaching_analyses
  FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert their own coaching analyses" ON public.coaching_analyses
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own coaching analyses" ON public.coaching_analyses
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own coaching analyses" ON public.coaching_analyses
  FOR DELETE USING (auth.uid() = profile_id);

CREATE TRIGGER update_coaching_analyses_updated_at
  BEFORE UPDATE ON public.coaching_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();