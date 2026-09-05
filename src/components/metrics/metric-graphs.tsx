// ---------------------------------------------------------------------------
// BotDiff — Shared graph & metric presentation layer
//
// Every BotDiff visualisation goes through these components so they all speak
// the same language: metric name, big current value, semantic trend, labelled
// reference lines, one plain-English interpretation.
//
// Mini cards = summaries. Full cards = context. No page rolls its own chart.
// ---------------------------------------------------------------------------

import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  formatMetricValue,
  trendArrow,
  trendTone,
  type MetricReading,
  type MetricTone,
  type MetricTrend,
} from "@/lib/metrics/metric-reading";

const TONE_TEXT: Record<MetricTone, string> = {
  positive: "text-success",
  caution: "text-warning",
  neutral: "text-foreground",
  muted: "text-muted-foreground",
};

const TONE_CHIP: Record<MetricTone, string> = {
  positive: "bg-success/12 text-success ring-success/25",
  caution: "bg-warning/12 text-warning ring-warning/25",
  neutral: "bg-white/[0.05] text-muted-foreground ring-white/10",
  muted: "bg-white/[0.03] text-muted-foreground ring-white/[0.06]",
};

const TONE_STROKE: Record<MetricTone, string> = {
  positive: "var(--success)",
  caution: "var(--warning)",
  neutral: "var(--primary)",
  muted: "var(--muted-foreground)",
};

/** Semantic trend chip: colour + text + (only when meaningful) an arrow. */
export function TrendIndicator({
  reading,
  compact = false,
}: {
  reading: MetricReading;
  compact?: boolean;
}) {
  const tone = trendTone(reading.trend);
  const arrow = reading.direction === "contextual" ? null : trendArrow(reading);
  const Icon = arrow === "up" ? ArrowUpRight : arrow === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${TONE_CHIP[tone]} ${
        compact ? "text-[10px]" : "text-xs"
      } font-medium whitespace-nowrap`}
    >
      {arrow && <Icon className="size-3" aria-hidden />}
      {reading.trendLabel}
    </span>
  );
}

function GraphTooltip({
  active,
  payload,
  unit,
  name,
}: {
  active?: boolean;
  payload?: { payload: { label?: string; date?: string; value: number } }[];
  unit: string;
  name: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs text-foreground shadow-lg">
      {p.label && <div className="font-medium">{p.label}</div>}
      <div className="text-muted-foreground">
        {name}: <span className="text-foreground">{formatMetricValue(p.value, unit)}</span>
      </div>
      {p.date && <div className="text-muted-foreground">{p.date}</div>}
    </div>
  );
}

export function InsufficientDataState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[6rem] place-items-center rounded-2xl bg-white/[0.02] px-4 py-6 text-center">
      <p className="max-w-[22rem] text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function toneFor(trend: MetricTrend): MetricTone {
  return trendTone(trend);
}

/** The player's history as one line. Optional labelled reference lines. */
function MetricLine({
  reading,
  height,
  showAxes,
}: {
  reading: MetricReading;
  height: number;
  showAxes: boolean;
}) {
  const tone = toneFor(reading.trend);
  const stroke = TONE_STROKE[tone];
  const gradId = `metric-grad-${reading.key}`;
  const last = reading.points[reading.points.length - 1];
  const refs = [reading.baseline, reading.target].filter(Boolean) as NonNullable<
    MetricReading["target"]
  >[];
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={reading.points} margin={{ top: 10, bottom: 0, left: showAxes ? -18 : 0, right: 10 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis
            hide={!showAxes}
            domain={["dataMin", "dataMax"]}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={44}
            tickCount={4}
            allowDecimals={false}
          />
          <XAxis dataKey="label" hide />
          {showAxes && (
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={<GraphTooltip unit={reading.unit} name={reading.name} />}
            />
          )}
          {showAxes &&
            refs.map((r) => (
              <ReferenceLine
                key={r.kind}
                y={r.value}
                stroke={r.kind === "target" ? "var(--accent-gold, var(--primary))" : "var(--muted-foreground)"}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `${r.label} · ${formatMetricValue(r.value, reading.unit)}`,
                  position: "insideTopRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                }}
              />
            ))}
          {!showAxes &&
            reading.target && (
              <ReferenceLine y={reading.target.value} stroke="var(--muted-foreground)" strokeDasharray="3 3" strokeWidth={1} />
            )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.25}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 4, fill: stroke }}
          />
          {last && (
            <ReferenceLine
              x={last.label}
              stroke="transparent"
              label={{ value: "●", position: "top", fill: stroke, fontSize: 12 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Mini card — metric name, current value, trend, sparkline, one comparison.
 * No axes, no legends, no target labels.
 */
export function MiniMetricCard({ reading }: { reading: MetricReading }) {
  const tone = toneFor(reading.trend);
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-muted-foreground">{reading.name}</span>
        <TrendIndicator reading={reading} compact />
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold ${TONE_TEXT[tone]}`}>
        {formatMetricValue(reading.value, reading.unit)}
      </div>
      {reading.points.length > 1 ? (
        <MetricLine reading={reading} height={44} showAxes={false} />
      ) : (
        <div className="h-11" />
      )}
      <p className="text-[11px] text-muted-foreground">
        {reading.previous != null
          ? `${reading.comparison} (${formatMetricValue(reading.previous, reading.unit)})`
          : reading.comparison}
      </p>
    </div>
  );
}

/**
 * Full graph card — name, big value, semantic trend, comparison, history with
 * labelled reference lines, and one interpretation sentence.
 */
export function MetricGraphCard({
  reading,
  height = 220,
  className = "",
  actions,
}: {
  reading: MetricReading;
  height?: number;
  className?: string;
  actions?: React.ReactNode;
}) {
  const tone = toneFor(reading.trend);
  const enoughHistory = reading.points.length > 1;
  return (
    <div className={`glass rise rounded-3xl p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{reading.name}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className={`font-display text-3xl font-semibold tracking-tight ${TONE_TEXT[tone]}`}>
              {formatMetricValue(reading.value, reading.unit)}
            </span>
            <TrendIndicator reading={reading} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {reading.previous != null
              ? `${reading.comparison} (${formatMetricValue(reading.previous, reading.unit)})`
              : reading.comparison}
            {reading.sourceLabel ? ` · ${reading.sourceLabel}` : ""}
          </p>
        </div>
        {actions}
      </div>

      {enoughHistory ? (
        <MetricLine reading={reading} height={height} showAxes />
      ) : (
        <InsufficientDataState message="Not enough history yet — import a few more games to see this graph." />
      )}

      <div className="mt-3 space-y-1">
        <p className="text-sm text-muted-foreground">{reading.interpretation}</p>
        {reading.direction !== "contextual" && (
          <p className="text-[11px] text-muted-foreground">
            {reading.direction === "higher" ? "Higher is better." : "Lower is better."}
            {reading.targetNote ? ` ${reading.targetNote}` : ""}
          </p>
        )}
        {reading.direction === "contextual" && (
          <p className="text-[11px] text-muted-foreground">
            Context dependent — BotDiff only calls this better or worse with supporting evidence.
            {reading.targetNote ? ` ${reading.targetNote}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/** Compact honest change tile for weekly / monthly score movement. */
export function ChangeTile({
  label,
  available,
  change,
  trendLabel,
  detail,
}: {
  label: string;
  available: boolean;
  change: number;
  trendLabel: string;
  detail: string;
}) {
  const tone: MetricTone = !available ? "muted" : change > 0 ? "positive" : change < 0 ? "caution" : "neutral";
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      {available ? (
        <div className={`mt-1 flex items-baseline gap-1 font-display text-2xl font-semibold ${TONE_TEXT[tone]}`}>
          <Icon className="size-4" aria-hidden />
          {change > 0 ? "+" : ""}
          {change}
        </div>
      ) : (
        <div className="mt-1 text-sm font-medium text-muted-foreground">Not enough history yet</div>
      )}
      <div className="mt-1 text-[11px] text-muted-foreground">{available ? `${trendLabel} · ${detail}` : detail}</div>
    </div>
  );
}
