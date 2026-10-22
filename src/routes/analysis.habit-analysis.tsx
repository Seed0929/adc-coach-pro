import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/habit-analysis")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Habit Analysis \u2014 BotDiff"},
      {"property": "og:description", "content": "The recurring patterns BotDiff has detected across your games."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Habit Analysis — BotDiff" },
      { name: "description", content: "The recurring patterns BotDiff has detected across your games." },
    ],
  }),
  component: () => <AnalysisPage page="habit-analysis" />,
});
