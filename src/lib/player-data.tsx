import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import champKaisa from "@/assets/champ-1.jpg";
import champEzreal from "@/assets/champ-2.jpg";
import heatmapImg from "@/assets/heatmap.jpg";

// ---------------------------------------------------------------------------
// Shared data contract
//
// Every dashboard surface reads from this single shape. Sample data and live
// Riot data both conform to `PlayerData`, so the UI never needs to change when
// we swap the source. When Riot integration lands, `useLivePlayerData()` will
// return the same structure and `usePlayerData()` picks it automatically.
// ---------------------------------------------------------------------------

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

export interface RankInfo {
  tier: string; // e.g. "Diamond I"
  lp: number;
}

export interface Snapshot {
  improvementScore: number;
  improvementDelta: number;
  focusStreakDays: number;
}

export interface TodaysFocus {
  headline: string;
  detail: string;
}

export interface MatchTimelinePoint {
  minute: number;
  cs: number; // your CS at this minute
  csBenchmark: number; // rank-average CS at this minute
  gold: number; // your gold at this minute
  goldBenchmark: number; // rank-average gold at this minute
}

export interface MatchStats {
  csPerMin: string;
  visionScore: string;
  damageShare: string;
}

export interface Match {
  id: number;
  champ: string;
  img: string;
  result: "Victory" | "Defeat";
  grade: string;
  kda: string;
  cs: string;
  lp: string;
  when: string;
  biggestMistake: string;
  biggestStrength: string;
  recommendation: string;
  stats: MatchStats;
  timeline: MatchTimelinePoint[];
}

export interface Champion {
  name: string;
  img: string;
  mastery: number;
  wr: string;
  games: number;
  note: string;
  tone: Tone;
}

export interface SkillTrend {
  label: string;
  value: number;
  tone: Tone;
}

export interface TrendPoint {
  week: string;
  score: number;
}

export interface CoachMessage {
  role: "coach" | "you";
  text: string;
}

export interface PlayerData {
  playerName: string;
  rank: RankInfo;
  snapshot: Snapshot;
  todaysFocus: TodaysFocus;
  matches: Match[];
  champions: Champion[];
  skills: SkillTrend[];
  trend: TrendPoint[];
  improvementScore: number;
  improvementDelta: number;
  recentImprovements: string[];
  todaysMission: string;
  heatmapImg: string;
  heatmapNote: string;
  coachSeed: CoachMessage[];
  coachSuggestions: string[];
}

// Realistic CS/gold curve builder for a single game.
function buildTimeline(
  csRate: number,
  goldRate: number,
  csEdge: number,
  goldEdge: number,
): MatchTimelinePoint[] {
  const minutes = [5, 10, 15, 20, 25, 30];
  return minutes.map((minute) => {
    const csBenchmark = Math.round(minute * 7.6);
    const goldBenchmark = Math.round(300 + minute * 380);
    return {
      minute,
      cs: Math.round(minute * csRate) + csEdge,
      csBenchmark,
      gold: Math.round(300 + minute * goldRate) + goldEdge,
      goldBenchmark,
    };
  });
}

export const SAMPLE_PLAYER: PlayerData = {
  playerName: "Sample ADC",
  rank: { tier: "Diamond I", lp: 47 },
  snapshot: {
    improvementScore: 84,
    improvementDelta: 3.1,
    focusStreakDays: 4,
  },
  todaysFocus: {
    headline: "Hold your position one screen back in mid-game teamfights.",
    detail:
      "You died first in 6 of your last 10 fights. Kiting from the backline is the single highest-impact habit to fix this week.",
  },
  matches: [
    {
      id: 1,
      champ: "Kai'Sa",
      img: champKaisa,
      result: "Victory",
      grade: "A",
      kda: "8 / 3 / 11",
      cs: "241",
      lp: "+24",
      when: "2h ago",
      biggestMistake: "Overextended in the river without vision at 14:00 and got caught.",
      biggestStrength: "Excellent early trades — you won lane by 900 gold at 10 minutes.",
      recommendation:
        "Ward the river bush before rotating and hold back until your team groups. Patience before mid-game skirmishes would have saved this game.",
      stats: { csPerMin: "8.9", visionScore: "24", damageShare: "31%" },
      timeline: buildTimeline(8.9, 430, 6, 700),
    },
    {
      id: 2,
      champ: "Ezreal",
      img: champEzreal,
      result: "Defeat",
      grade: "C",
      kda: "4 / 7 / 6",
      cs: "198",
      lp: "-19",
      when: "3h ago",
      biggestMistake: "Missed 4 recalls on wave crashes and fell 1.2k gold behind by 20 minutes.",
      biggestStrength: "Kept a positive vision score even while behind.",
      recommendation:
        "Recall on wave crashes instead of shoving into a frozen lane. Track the enemy jungler before stepping up.",
      stats: { csPerMin: "7.1", visionScore: "28", damageShare: "24%" },
      timeline: buildTimeline(7.1, 350, -8, -600),
    },
    {
      id: 3,
      champ: "Kai'Sa",
      img: champKaisa,
      result: "Victory",
      grade: "S",
      kda: "12 / 1 / 9",
      cs: "268",
      lp: "+21",
      when: "Yesterday",
      biggestMistake: "Took a risky flash forward at 28:00 that could have thrown the lead.",
      biggestStrength: "Flawless kiting in the 26-minute teamfight — 4 kills, zero deaths.",
      recommendation:
        "Keep prioritizing Kai'Sa in tough queues. Trust your positioning — you don't need the flash-forward plays.",
      stats: { csPerMin: "9.4", visionScore: "31", damageShare: "38%" },
      timeline: buildTimeline(9.4, 470, 12, 1100),
    },
    {
      id: 4,
      champ: "Ezreal",
      img: champEzreal,
      result: "Defeat",
      grade: "B",
      kda: "6 / 5 / 8",
      cs: "212",
      lp: "-17",
      when: "Yesterday",
      biggestMistake: "Grouped too late for the 30-minute Baron and lost the objective.",
      biggestStrength: "Strong mid-game farm — you hit your two-item spike on time.",
      recommendation:
        "Rotate to objectives 20 seconds earlier. Ping your team before the objective spawns so you're grouped in time.",
      stats: { csPerMin: "7.6", visionScore: "22", damageShare: "27%" },
      timeline: buildTimeline(7.6, 390, 2, 100),
    },
  ],
  champions: [
    {
      name: "Kai'Sa",
      img: champKaisa,
      mastery: 92,
      wr: "62%",
      games: 148,
      note: "Your best carry. Keep prioritizing this in tough queues.",
      tone: "success",
    },
    {
      name: "Ezreal",
      img: champEzreal,
      mastery: 74,
      wr: "48%",
      games: 96,
      note: "Safe pick, but your mid-game positioning dips here.",
      tone: "warning",
    },
  ],
  skills: [
    { label: "Positioning", value: 68, tone: "warning" },
    { label: "Wave Management", value: 82, tone: "success" },
    { label: "Vision", value: 74, tone: "success" },
    { label: "Trading", value: 71, tone: "success" },
  ],
  trend: [
    { week: "W1", score: 62 },
    { week: "W2", score: 65 },
    { week: "W3", score: 61 },
    { week: "W4", score: 70 },
    { week: "W5", score: 74 },
    { week: "W6", score: 78 },
    { week: "W7", score: 84 },
  ],
  improvementScore: 84,
  improvementDelta: 22,
  recentImprovements: [
    "Vision score up 18% over 2 weeks",
    "CS at 10 min improved from 72 → 81",
    "First-death rate down from 41% → 28%",
  ],
  todaysMission: "Die fewer than 4 times and stay behind your frontline.",
  heatmapImg,
  heatmapNote:
    "Your deaths cluster in the enemy river during mid-game. Warding these bushes before rotating removes most of them.",
  coachSeed: [
    {
      role: "coach",
      text: "Welcome back. I reviewed your last session — your laning is sharp, but you're stepping too far forward in mid-game fights. Want to dig into that, or ask me anything?",
    },
  ],
  coachSuggestions: [
    "Why am I losing lane?",
    "What should I practice today?",
    "Review my last game.",
    "What matchup am I weakest at?",
  ],
};

/**
 * Returns the player's dashboard data plus whether it's sample data.
 *
 * When Riot integration lands, fetch the real `PlayerData` here (keyed on the
 * linked riot account) and return it with `isSample: false`. The UI stays
 * identical because both paths return the same `PlayerData` shape.
 */
export function usePlayerData(): { isSample: boolean; data: PlayerData } {
  const { profile } = useAuth();
  const isSample = !profile?.riot_connected;

  return useMemo(() => {
    // TODO(riot): when `profile.riot_connected`, return live data here.
    return { isSample, data: SAMPLE_PLAYER };
  }, [isSample]);
}
