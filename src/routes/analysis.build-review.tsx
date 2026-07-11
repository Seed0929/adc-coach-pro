import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/build-review")({
  head: () => ({
    meta: [
      { title: "Item Review — BotDiff" },
      { name: "description", content: "Light itemization coaching — one tradeoff to consider, never a full build guide." },
    ],
  }),
  component: () => <AnalysisPage page="build-review" />,
});
