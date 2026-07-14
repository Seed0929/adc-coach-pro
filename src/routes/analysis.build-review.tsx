import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/build-review")({
  head: () => ({
    meta: [
      { title: "Power Spike Timing — BotDiff" },
      { name: "description", content: "When you reach your power spikes and the habits that decide those timings — decision-first coaching, never a build guide." },
    ],
  }),
  component: () => <AnalysisPage page="build-review" />,
});
