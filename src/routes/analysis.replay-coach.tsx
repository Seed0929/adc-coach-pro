import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/replay-coach")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Replay Coach \u2014 BotDiff"},
      {"property": "og:description", "content": "Review every recent game and the moments that decided it."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Replay Coach — BotDiff" },
      { name: "description", content: "Review every recent game and the moments that decided it." },
    ],
  }),
  component: () => <AnalysisPage page="replay-coach" />,
});
