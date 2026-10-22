import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "@/components/analysis-page";

export const Route = createFileRoute("/analysis/build-review")({
  head: () => ({
    meta: [
      {"property": "og:title", "content": "Power Spike Timing \u2014 BotDiff"},
      {"property": "og:description", "content": "When you reach your power spikes and the habits that decide those timings \u2014 decision-first coaching, never a build guide."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
      { title: "Power Spike Timing — BotDiff" },
      { name: "description", content: "When you reach your power spikes and the habits that decide those timings — decision-first coaching, never a build guide." },
    ],
  }),
  component: () => <AnalysisPage page="build-review" />,
});
