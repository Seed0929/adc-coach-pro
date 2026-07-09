import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/build-review")({
  head: () => ({
    meta: [
      { title: "Build Review — BotDiff" },
      { name: "description", content: "Rune, item, and mastery coaching for your games." },
    ],
  }),
  component: () => <AnalysisPage page="build-review" />,
});
