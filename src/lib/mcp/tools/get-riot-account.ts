import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_riot_account",
  title: "Get linked Riot account",
  description: "Return the Riot account linked to the signed-in BotDiff player.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("riot_accounts")
      .select("game_name, tag_line, region, summoner_level, last_sync")
      .eq("profile_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No Riot account linked yet." }] };
    const account = {
      riotId: `${data.game_name}#${data.tag_line}`,
      region: data.region,
      summonerLevel: data.summoner_level,
      lastSync: data.last_sync,
    };
    return { content: [{ type: "text", text: JSON.stringify(account) }], structuredContent: { account } };
  },
});
