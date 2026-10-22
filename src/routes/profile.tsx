import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Player Profile — BotDiff" },
      {
        name: "description",
        content:
          "Your BotDiff improvement journal: current form in real stats, champion progress, achievements, and personal records.",
      },
      { property: "og:title", content: "Player Profile — BotDiff" },
      { property: "og:description", content: "Track your long-term improvement across every ranked game." },
    ],
  }),
  component: () => <Outlet />,
});