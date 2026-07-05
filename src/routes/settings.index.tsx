import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { User, Link2, Bell, Palette, Check, type LucideIcon } from "lucide-react";
import { AppShell, Pill, PageHeader } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
});

function Row({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/[0.03] p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        <div className="truncate text-sm text-muted-foreground">{desc}</div>
      </div>
      {action}
    </div>
  );
}

function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();
  return (
    <div className="rounded-2xl bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          <Palette className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Appearance</div>
          <div className="truncate text-sm text-muted-foreground">
            Pick a theme — BotDiff remembers it across sessions.
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {themes.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                active
                  ? "border-primary/60 bg-primary/[0.08]"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-white/10"
                style={{ background: t.swatch.background }}
              >
                <span
                  className="size-4 rounded-full"
                  style={{ background: t.swatch.primary }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {t.name}
                  {active && <Check className="size-4 text-primary" />}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettingsPage() {
  const { user, profile } = useAuth();
  const [riot, setRiot] = useState<{ game_name: string; tag_line: string; region: string } | null>(
    null,
  );

  useEffect(() => {
    if (!user) return;
    supabase
      .from("riot_accounts")
      .select("game_name, tag_line, region")
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRiot(data));
  }, [user]);

  const displayName = profile?.display_name || profile?.username || "BotDiff Player";

  return (
    <AppShell>
      <PageHeader eyebrow="Settings" title="Your account" subtitle="Keep BotDiff tuned to you." />

      <div className="glass rise space-y-3 rounded-3xl p-5">
        <Row
          icon={User}
          title="Profile"
          desc={displayName}
          action={
            <Link
              to="/settings/profile"
              className="rounded-full border border-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              Edit Profile
            </Link>
          }
        />
        <Row
          icon={Link2}
          title="Connected Riot Account"
          desc={riot ? `${riot.game_name}#${riot.tag_line} · ${riot.region}` : "Not linked yet"}
          action={
            <Link
              to="/welcome"
              className="rounded-full border border-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              {riot ? "Update Riot ID" : "Set Riot ID"}
            </Link>
          }
        />
        <Row
          icon={Bell}
          title="Notifications"
          desc="Daily focus reminders"
          action={<Pill tone="success">On</Pill>}
        />
        <Row
          icon={Palette}
          title="Appearance"
          desc="Calm dark theme"
          action={<Pill tone="primary">Default</Pill>}
        />
      </div>
    </AppShell>
  );
}