CREATE TYPE public.feedback_report_type AS ENUM ('bug','coaching_feedback','incorrect_data','ui_issue','feature_request','other');
CREATE TYPE public.feedback_report_status AS ENUM ('new','reviewing','resolved','closed');

CREATE TABLE public.feedback_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type public.feedback_report_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status public.feedback_report_status NOT NULL DEFAULT 'new',
  route text,
  feature text,
  match_id text,
  coaching_verdict text,
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX feedback_reports_profile_created_idx ON public.feedback_reports (profile_id, created_at DESC);

GRANT SELECT, INSERT ON public.feedback_reports TO authenticated;
GRANT ALL ON public.feedback_reports TO service_role;

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON public.feedback_reports FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create their own reports"
  ON public.feedback_reports FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND status = 'new');

CREATE TRIGGER update_feedback_reports_updated_at
  BEFORE UPDATE ON public.feedback_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();