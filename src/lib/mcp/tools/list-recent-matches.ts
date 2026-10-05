import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_matches",
  title: "List recent matches",
  description: "List the signed-in player's most recent synced matches with real Riot stats.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many matches to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("matches")
      .select("match_id, champion_name, team_position, queue_label, win, kills, deaths, assists, cs, gold, vision_score, game_duration, game_creation")
      .eq("profile_id", ctx.getUserId()!)
      .order("game_creation", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const matches = (data ?? []).map((m) => ({
      matchId: m.match_id,
      champion: m.champion_name,
      role: m.team_position,
      queue: m.queue_label,
      win: m.win,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      cs: m.cs,
      gold: m.gold,
      visionScore: m.vision_score,
      durationSeconds: m.game_duration,
      playedAt: m.game_creation,
    }));
    return { content: [{ type: "text", text: JSON.stringify(matches) }], structuredContent: { matches } };
  },
});
