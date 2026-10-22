import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/coach-memory")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Coach Memory \u2014 BotDiff"},
      {"property": "og:description", "content": "What your coach remembers about how you play."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Coach Memory — BotDiff" },
      { name: "description", content: "What your coach remembers about how you play." },
    ],
  }),
  component: () => <AnalysisPage page="coach-memory" />,
});
