import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/practice-history")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Practice History \u2014 BotDiff"},
      {"property": "og:description", "content": "Your long-term goals, practice tasks, and past reports."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Practice History — BotDiff" },
      { name: "description", content: "Your long-term goals, practice tasks, and past reports." },
    ],
  }),
  component: () => <AnalysisPage page="practice-history" />,
});
