import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Player Profile — BotDiff" },
      {
        name: "description",
        content:
          "Your BotDiff improvement journal: BotDiff Score, improvement history, champion progress, achievements, and personal records.",
      },
      { property: "og:title", content: "Player Profile — BotDiff" },
      { property: "og:description", content: "Track your long-term improvement across every ranked game." },
    ],
  }),
  component: () => <Outlet />,
});