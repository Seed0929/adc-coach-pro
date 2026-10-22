import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/decision-timeline")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Decision Timeline \u2014 BotDiff"},
      {"property": "og:description", "content": "The decisions that repeat across your games, in order."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Decision Timeline — BotDiff" },
      { name: "description", content: "The decisions that repeat across your games, in order." },
    ],
  }),
  component: () => <AnalysisPage page="decision-timeline" />,
});
