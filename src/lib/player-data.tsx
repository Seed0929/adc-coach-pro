import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getRiotDashboard, type DashboardData } from "@/lib/dashboard.functions";
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
  confidence: number; // 0-100
  impact: "Low" | "Medium" | "High";
  difficulty: "Easy" | "Medium" | "Hard";
  practiceTime: string; // e.g. "10 minutes"
}

export interface CoachingOverview {
  primaryStrength: string;
  primaryWeakness: string;
  consistencyScore: number; // 0-100
  improvementTrendPct: number; // e.g. +14
}

export interface PerformanceOverview {
  grade: string;
  rank: string;
  role: string;
  championPool: number;
  avgCs: string;
  avgVision: string;
  avgKda: string;
}

export interface AiInsight {
  biggestOpportunity: string;
  recommendedPractice: string;
  commonMistake: string;
  positiveHabit: string;
  estimatedLpGain: string;
}

export interface DailyGoal {
  label: string;
  progress: number; // 0-100
  done: boolean;
}

export interface MatchTimelinePoint {
  minute: number;
  cs: number; // your CS at this minute
  csBenchmark: number; // rank-average CS at this minute
  gold: number; // your gold at this minute
  goldBenchmark: number; // rank-average gold at this minute
  damage: number; // damage to champions at this minute
  damageBenchmark: number; // rank-average damage at this minute
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
  gameLength: string;
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
  avgGrade: string;
  trend: number; // e.g. +6 or -3 (win-rate/grade momentum)
}

export interface SkillTrend {
  label: string;
  value: number;
  tone: Tone;
  delta: number; // week-over-week change, e.g. +8 or -3
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
  performanceGrade: string;
  visionScore: number;
  coachingSummary: string;
  snapshot: Snapshot;
  todaysFocus: TodaysFocus;
  coachingOverview: CoachingOverview;
  performanceOverview: PerformanceOverview;
  aiInsight: AiInsight;
  dailyGoals: DailyGoal[];
  matches: Match[];
  champions: Champion[];
  skills: SkillTrend[];
  trend: TrendPoint[];
  improvementScore: number;
  improvementDelta: number;
  strengths: string[];
  weaknesses: string[];
  improvementPlan: string[];
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
  damageRate = 420,
  damageEdge = 0,
): MatchTimelinePoint[] {
  const minutes = [5, 10, 15, 20, 25, 30];
  return minutes.map((minute) => {
    const csBenchmark = Math.round(minute * 7.6);
    const goldBenchmark = Math.round(300 + minute * 380);
    const damageBenchmark = Math.round(minute * 390);
    return {
      minute,
      cs: Math.round(minute * csRate) + csEdge,
      csBenchmark,
      gold: Math.round(300 + minute * goldRate) + goldEdge,
      goldBenchmark,
      damage: Math.max(0, Math.round(minute * damageRate) + damageEdge),
      damageBenchmark,
    };
  });
}

export const SAMPLE_PLAYER: PlayerData = {
  playerName: "Sample ADC",
  rank: { tier: "Diamond I", lp: 47 },
  performanceGrade: "A-",
  visionScore: 26,
  coachingSummary:
    "Your lane fundamentals are climbing, but mid-game positioning still decides most losses. Prioritize safe rotations and fight from one screen behind your frontline.",
  snapshot: {
    improvementScore: 84,
    improvementDelta: 3.1,
    focusStreakDays: 4,
  },
  todaysFocus: {
    headline: "Hold your position one screen back in mid-game teamfights.",
    detail:
      "You died first in 6 of your last 10 fights. Kiting from the backline is the single highest-impact habit to fix this week.",
    confidence: 92,
    impact: "High",
    difficulty: "Easy",
    practiceTime: "10 minutes",
  },
  coachingOverview: {
    primaryStrength: "Excellent late-game positioning and kiting under pressure.",
    primaryWeakness: "Overextending after taking first tower without vision.",
    consistencyScore: 81,
    improvementTrendPct: 14,
  },
  performanceOverview: {
    grade: "A-",
    rank: "Diamond I · 47 LP",
    role: "Bot / ADC",
    championPool: 6,
    avgCs: "8.4 / min",
    avgVision: "26",
    avgKda: "3.8 : 1",
  },
  aiInsight: {
    biggestOpportunity:
      "Wave management before rotating — you leave 12+ CS on the map each game before roaming.",
    recommendedPractice:
      "Practice tool: crash three cannon waves cleanly, then recall on the crash for 10 minutes.",
    commonMistake:
      "Stepping past your frontline in the first 3 seconds of every mid-game fight.",
    positiveHabit:
      "Consistently buying and placing control wards before objectives.",
    estimatedLpGain: "+65 LP per month if wave management improves.",
  },
  dailyGoals: [
    { label: "Reach 8 CS / min", progress: 76, done: false },
    { label: "Die fewer than 5 times", progress: 100, done: true },
    { label: "Place 10 control wards", progress: 60, done: false },
    { label: "Avoid fights before objectives", progress: 45, done: false },
  ],
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
      gameLength: "32:14",
      biggestMistake: "Overextended in the river without vision at 14:00 and got caught.",
      biggestStrength: "Excellent early trades — you won lane by 900 gold at 10 minutes.",
      recommendation:
        "Ward the river bush before rotating and hold back until your team groups. Patience before mid-game skirmishes would have saved this game.",
      stats: { csPerMin: "8.9", visionScore: "24", damageShare: "31%" },
      timeline: buildTimeline(8.9, 430, 6, 700, 475, 900),
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
      gameLength: "28:47",
      biggestMistake: "Missed 4 recalls on wave crashes and fell 1.2k gold behind by 20 minutes.",
      biggestStrength: "Kept a positive vision score even while behind.",
      recommendation:
        "Recall on wave crashes instead of shoving into a frozen lane. Track the enemy jungler before stepping up.",
      stats: { csPerMin: "7.1", visionScore: "28", damageShare: "24%" },
      timeline: buildTimeline(7.1, 350, -8, -600, 330, -650),
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
      gameLength: "34:52",
      biggestMistake: "Took a risky flash forward at 28:00 that could have thrown the lead.",
      biggestStrength: "Flawless kiting in the 26-minute teamfight — 4 kills, zero deaths.",
      recommendation:
        "Keep prioritizing Kai'Sa in tough queues. Trust your positioning — you don't need the flash-forward plays.",
      stats: { csPerMin: "9.4", visionScore: "31", damageShare: "38%" },
      timeline: buildTimeline(9.4, 470, 12, 1100, 540, 1300),
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
      gameLength: "36:20",
      biggestMistake: "Grouped too late for the 30-minute Baron and lost the objective.",
      biggestStrength: "Strong mid-game farm — you hit your two-item spike on time.",
      recommendation:
        "Rotate to objectives 20 seconds earlier. Ping your team before the objective spawns so you're grouped in time.",
      stats: { csPerMin: "7.6", visionScore: "22", damageShare: "27%" },
      timeline: buildTimeline(7.6, 390, 2, 100, 405, 150),
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
      avgGrade: "A",
      trend: 6,
    },
    {
      name: "Ezreal",
      img: champEzreal,
      mastery: 74,
      wr: "48%",
      games: 96,
      note: "Safe pick, but your mid-game positioning dips here.",
      tone: "warning",
      avgGrade: "B-",
      trend: -3,
    },
  ],
  skills: [
    { label: "Wave Management", value: 82, tone: "success", delta: 9 },
    { label: "Team Fighting", value: 68, tone: "warning", delta: -4 },
    { label: "CS", value: 79, tone: "success", delta: 6 },
    { label: "Vision", value: 74, tone: "success", delta: 3 },
    { label: "Objective Control", value: 63, tone: "warning", delta: -2 },
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
  strengths: [
    "Wave control before first recall",
    "Teamfight damage when positioned safely",
    "Kai'Sa execution around two-item spikes",
  ],
  weaknesses: [
    "River rotations without support or jungle information",
    "Late objective setup around Baron and third dragon",
    "Recall timing after crashing cannon waves",
  ],
  improvementPlan: [
    "For the next 5 games, say enemy jungle position out loud before crossing river.",
    "Recall immediately after clean wave crashes instead of fishing for one more plate.",
    "In every mid-game fight, start one screen behind your frontline and only step up after key engage cooldowns are used.",
  ],
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

// ---------------------------------------------------------------------------
// Provider layer
//
// The UI consumes ONE interface (`useBotDiffData`). Today it is backed by the
// demo dataset (`DemoDataProvider` behaviour). When the Riot API is wired up,
// swap the `data` source for a `RiotDataProvider` that returns the same
// `PlayerData` shape — no component changes required.
// ---------------------------------------------------------------------------

/** The player's Riot identity, stored during onboarding. */
export interface PlayerIdentity {
  gameName: string;
  tagLine: string;
  region: string;
  /** Convenience "GameName#TAG" string for display. */
  riotId: string;
}

export interface BotDiffDataValue {
  /** True while showing sample analysis (i.e. no live Riot connection yet). */
  isDemo: boolean;
  /** The Riot identity captured at onboarding, or null if none linked. */
  identity: PlayerIdentity | null;
  /** The dashboard dataset every surface renders from. */
  data: PlayerData;
  /** Re-reads the linked Riot identity from the backend. */
  refreshIdentity: () => Promise<void>;
}

const DataContext = createContext<BotDiffDataValue | undefined>(undefined);

function useDemoDataSource(): PlayerData {
  return SAMPLE_PLAYER;
}

function useRiotDataSource(): PlayerData | null {
  // TODO(riot): fetch verified Riot match, timeline, champion, and coaching data
  // and return the exact same PlayerData shape used by demo mode.
  return null;
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  return <DataContext.Provider value={useDemoBotDiffValue()}>{children}</DataContext.Provider>;
}

export function RiotDataProvider({ children }: { children: ReactNode }) {
  return <DataContext.Provider value={useRiotBotDiffValue()}>{children}</DataContext.Provider>;
}

function useSharedIdentity() {
  const { user, profile } = useAuth();
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);

  const refreshIdentity = useCallback(async () => {
    if (!user) {
      setIdentity(null);
      return;
    }
    const { data } = await supabase
      .from("riot_accounts")
      .select("game_name, tag_line, region")
      .eq("profile_id", user.id)
      .maybeSingle();
    setIdentity(
      data
        ? {
            gameName: data.game_name,
            tagLine: data.tag_line,
            region: data.region,
            riotId: `${data.game_name}#${data.tag_line}`,
          }
        : null,
    );
  }, [user]);

  useEffect(() => {
    void refreshIdentity();
  }, [refreshIdentity, profile]);

  return { profile, identity, refreshIdentity };
}

function useDemoBotDiffValue(): BotDiffDataValue {
  const { identity, refreshIdentity } = useSharedIdentity();
  const data = useDemoDataSource();
  return useMemo(
    () => ({ isDemo: true, identity, data, refreshIdentity }),
    [identity, data, refreshIdentity],
  );
}

function useRiotBotDiffValue(): BotDiffDataValue {
  const { identity, refreshIdentity } = useSharedIdentity();
  const riotData = useRiotDataSource();
  const data = riotData ?? SAMPLE_PLAYER;
  return useMemo(
    () => ({ isDemo: !riotData, identity, data, refreshIdentity }),
    [riotData, identity, data, refreshIdentity],
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  // Demo mode is on until a real Riot API connection exists. This flag flips
  // off automatically once `riot_connected` becomes true.
  const { profile } = useAuth();
  return profile?.riot_connected ? <RiotDataProvider>{children}</RiotDataProvider> : <DemoDataProvider>{children}</DemoDataProvider>;
}

/** Single interface every dashboard surface consumes. */
export function useBotDiffData(): BotDiffDataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useBotDiffData must be used within a DataProvider");
  return ctx;
}
