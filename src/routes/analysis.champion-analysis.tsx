import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/champion-analysis")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Champion Analysis \u2014 BotDiff"},
      {"property": "og:description", "content": "How each champion in your pool is trending."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Champion Analysis — BotDiff" },
      { name: "description", content: "How each champion in your pool is trending." },
    ],
  }),
  component: () => <AnalysisPage page="champion-analysis" />,
});
