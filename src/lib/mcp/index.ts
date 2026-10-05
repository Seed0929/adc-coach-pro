import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getRiotAccount from "./tools/get-riot-account";
import listRecentMatches from "./tools/list-recent-matches";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "botdiff",
  title: "BotDiff",
  version: "0.1.0",
  instructions:
    "Read-only access to the signed-in BotDiff player's linked Riot account and synced match stats. Only report data the tools return; never invent stats.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getRiotAccount, listRecentMatches],
});
