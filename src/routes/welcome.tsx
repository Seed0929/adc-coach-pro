import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Gamepad2, Hash, Globe, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useBotDiffData } from "@/lib/player-data";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome — BotDiff" },
      {
        name: "description",
        content: "Link your Riot account to start your personalized BotDiff coaching journey.",
      },
    ],
  }),
  component: WelcomePage,
});

const REGIONS = [
  { value: "NA", label: "North America (NA)" },
  { value: "EUW", label: "Europe West (EUW)" },
  { value: "EUNE", label: "Europe Nordic & East (EUNE)" },
  { value: "KR", label: "Korea (KR)" },
  { value: "BR", label: "Brazil (BR)" },
  { value: "LAN", label: "Latin America North (LAN)" },
  { value: "LAS", label: "Latin America South (LAS)" },
  { value: "OCE", label: "Oceania (OCE)" },
  { value: "TR", label: "Turkey (TR)" },
  { value: "RU", label: "Russia (RU)" },
  { value: "JP", label: "Japan (JP)" },
];

function WelcomePage() {
  const navigate = useNavigate();
  const { loading, isAuthenticated, user, profile, refreshProfile } = useAuth();
  const { identity, refreshIdentity } = useBotDiffData();

  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("NA");
  const [submitting, setSubmitting] = useState(false);

  // Only guard authentication here. Onboarded users may still open this page
  // manually (e.g. from Settings) to update their Riot identity — we never
  // bounce them away automatically.
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) navigate({ to: "/auth", replace: true });
  }, [loading, isAuthenticated, navigate]);

  // Prefill with the existing Riot identity when editing after onboarding.
  useEffect(() => {
    if (!identity) return;
    setGameName(identity.gameName);
    setTagLine(identity.tagLine);
    setRegion(identity.region);
  }, [identity]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !user) return;

    const name = gameName.trim();
    const tag = tagLine.trim().replace(/^#/, "");
    if (!name) return toast.error("Enter your Riot Game Name.");
    if (!tag) return toast.error("Enter your Tag Line.");

    setSubmitting(true);
    try {
      const { error: riotError } = await supabase.from("riot_accounts").upsert(
        {
          profile_id: user.id,
          game_name: name,
          tag_line: tag,
          region,
          linked_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );
      if (riotError) throw riotError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await Promise.all([refreshProfile(), refreshIdentity()]);
      toast.success("Riot identity saved. Welcome to BotDiff!");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 font-sans text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[42rem] rounded-full bg-primary/20 blur-[140px] [animation:float-glow_16s_ease-in-out_infinite]" />
        <div className="absolute -right-52 bottom-1/4 size-[38rem] rounded-full bg-success/10 blur-[150px] [animation:float-glow_22s_ease-in-out_infinite]" />
      </div>

      <div className="rise glass w-full max-w-lg rounded-3xl p-8 md:p-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" /> First-time setup
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Welcome to BotDiff
        </h1>
        <p className="mt-3 text-muted-foreground">
          Link your Riot account so your coach knows who to analyze. You can update this anytime in
          Settings.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Riot Game Name</label>
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 focus-within:bg-white/[0.06]">
              <Gamepad2 className="size-[18px] shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. Faker"
                required
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Tag Line</label>
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 focus-within:bg-white/[0.06]">
              <Hash className="size-[18px] shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. KR1"
                required
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Region</label>
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 focus-within:bg-white/[0.06]">
              <Globe className="size-[18px] shrink-0 text-muted-foreground" />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-transparent text-sm outline-none [&>option]:bg-background"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Continue to dashboard
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}