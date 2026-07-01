import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "./index";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BotDiff" },
      {
        name: "description",
        content: "Your BotDiff coaching dashboard with today’s focus, demo analysis, and progress snapshot.",
      },
    ],
  }),
  component: DashboardPage,
});