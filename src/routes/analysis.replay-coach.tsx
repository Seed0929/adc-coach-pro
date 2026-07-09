import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/replay-coach")({
  head: () => ({
    meta: [
      { title: "Replay Coach — BotDiff" },
      { name: "description", content: "Review every recent game and the moments that decided it." },
    ],
  }),
  component: () => <AnalysisPage page="replay-coach" />,
});
