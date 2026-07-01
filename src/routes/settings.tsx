import { createFileRoute, Outlet } from "@tanstack/react-router";

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
  component: () => <Outlet />,
});