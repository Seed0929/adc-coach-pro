import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { User, Link2, Bell, Palette, type LucideIcon } from "lucide-react";
import { AppShell, Pill, PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BotDiff" },
      {
        name: "description",
        content: "Manage your BotDiff profile, connected Riot account, notifications, and appearance.",
      },
      { property: "og:title", content: "Settings — BotDiff" },
      { property: "og:description", content: "Manage your BotDiff account and preferences." },
    ],
  }),
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

function SettingsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Settings" title="Your account" subtitle="Keep BotDiff tuned to you." />

      <div className="glass rise space-y-3 rounded-3xl p-5">
        <Row
          icon={User}
          title="Profile"
          desc="Ranked Player · Diamond I"
          action={
            <button className="rounded-full border border-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/[0.06]">
              Edit
            </button>
          }
        />
        <Row
          icon={Link2}
          title="Connected Riot Account"
          desc="Ready to connect for real match analysis"
          action={<Pill tone="warning">Not linked</Pill>}
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