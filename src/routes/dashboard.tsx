import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "./index";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Dashboard \u2014 BotDiff"},
      {"property": "og:description", "content": "Your BotDiff coaching dashboard with today\u2019s focus, demo analysis, and progress snapshot."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Dashboard — BotDiff" },
      {
        name: "description",
        content: "Your BotDiff coaching dashboard with today’s focus, demo analysis, and progress snapshot.",
      },
    ],
  }),
  component: DashboardPage,
});