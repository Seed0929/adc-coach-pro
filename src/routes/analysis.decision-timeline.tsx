import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/decision-timeline")({
  head: () => ({
    meta: [
      { title: "Decision Timeline — BotDiff" },
      { name: "description", content: "The decisions that repeat across your games, in order." },
    ],
  }),
  component: () => <AnalysisPage page="decision-timeline" />,
});
