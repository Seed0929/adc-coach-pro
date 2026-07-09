import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/champion-analysis")({
  head: () => ({
    meta: [
      { title: "Champion Analysis — BotDiff" },
      { name: "description", content: "How each champion in your pool is trending." },
    ],
  }),
  component: () => <AnalysisPage page="champion-analysis" />,
});
