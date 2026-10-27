"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatShortDate, parseYmd } from "@/lib/dates";

export type ChartPoint = { date: string; value: number };
export type TargetLine = { value: number; label: string };

const ts = (ymd: string) => {
  const { y, m, d } = parseYmd(ymd);
  return Date.UTC(y, m - 1, d);
};
const ymdOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const DAY = 86_400_000;

/**
 * Line chart on a true time axis, so uneven gaps between sessions are drawn
 * honestly. Colours come from CSS variables, so it follows the light/dark theme.
 */
export function TrendChart({
  points,
  unit,
  targets = [],
  height = 280,
  ariaLabel,
  color = "var(--chart-1)",
}: {
  points: ChartPoint[];
  unit: string;
  targets?: TargetLine[];
  height?: number;
  ariaLabel: string;
  color?: string;
}) {
  const data = points.map((p) => ({ t: ts(p.date), value: p.value, date: p.date }));
  const values = [...points.map((p) => p.value), ...targets.map((t) => t.value)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.12, max === min ? Math.max(1, Math.abs(max) * 0.1) : 0);
  const lo = Math.floor(min - pad);
  const hi = Math.ceil(max + pad);
  const t0 = data[0]?.t ?? 0;
  const t1 = data[data.length - 1]?.t ?? 0;
  const span = Math.max(t1 - t0, DAY * 6);
  const domain: [number, number] = data.length > 1 ? [t0 - span * 0.04, t1 + span * 0.04] : [t0 - DAY * 3, t0 + DAY * 3];

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full text-xs">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={domain}
            tickCount={5}
            minTickGap={36}
            tickFormatter={(t: number) => formatShortDate(ymdOf(t))}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tickMargin={8}
          />
          <YAxis
            domain={[lo, hi]}
            width={44}
            tickCount={5}
            allowDecimals={false}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            tickMargin={4}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { date: string; value: number };
              return (
                <div className="rounded-md border border-border bg-surface-raised px-3 py-2 shadow-md">
                  <div className="text-xs text-muted-foreground">{formatDate(p.date)}</div>
                  <div className="tabular text-sm font-medium text-foreground">
                    {p.value}
                    {unit ? ` ${unit}` : ""}
                  </div>
                </div>
              );
            }}
          />
          {targets.map((t) => (
            <ReferenceLine
              key={`${t.label}-${t.value}`}
              y={t.value}
              stroke="var(--chart-4)"
              strokeDasharray="5 4"
              label={{ value: t.label, position: "insideTopRight", fill: "var(--chart-4)", fontSize: 11 }}
            />
          ))}
          <Line
            type="linear"
            dataKey="value"
            stroke={color}
            strokeWidth={2.25}
            dot={points.length > 36 ? false : { r: 3.5, fill: color, stroke: "var(--surface)", strokeWidth: 1.5 }}
            activeDot={{ r: 5.5, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
