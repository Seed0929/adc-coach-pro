import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/coach-memory")({
  head: () => ({
    meta: [
      { title: "Coach Memory — BotDiff" },
      { name: "description", content: "What your coach remembers about how you play." },
    ],
  }),
  component: () => <AnalysisPage page="coach-memory" />,
});
