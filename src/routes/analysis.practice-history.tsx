import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/practice-history")({
  head: () => ({
    meta: [
      { title: "Practice History — BotDiff" },
      { name: "description", content: "Your long-term goals, practice tasks, and past reports." },
    ],
  }),
  component: () => <AnalysisPage page="practice-history" />,
});
