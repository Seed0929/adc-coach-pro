import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/habit-analysis")({
  head: () => ({
    meta: [
      { title: "Habit Analysis — BotDiff" },
      { name: "description", content: "The recurring patterns BotDiff has detected across your games." },
    ],
  }),
  component: () => <AnalysisPage page="habit-analysis" />,
});
