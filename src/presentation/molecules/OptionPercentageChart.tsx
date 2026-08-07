"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "styled-components";
import type { ChoiceBreakdown } from "@/presentation/services/statsService";

export interface OptionPercentageChartProps { breakdown: ChoiceBreakdown; }

function shortenLabel(value: string) {
  return value.length > 28 ? `${value.slice(0, 27)}…` : value;
}

// The chart reserves one full row per option. This avoids the common Recharts
// overlap problem on long multiple-choice labels while retaining the full text
// in the native SVG title exposed by the tooltip on hover/focus.
export function OptionPercentageChart({ breakdown }: OptionPercentageChartProps) {
  const theme = useTheme();
  const data = breakdown.optionPercentages.map((item) => ({ option: item.option, shortOption: shortenLabel(item.option), percent: item.percent, count: item.count }));
  const height = Math.max(248, data.length * 56);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 12 }} barCategoryGap="30%">
        <CartesianGrid horizontal={false} stroke={theme.colors.border} strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: theme.colors.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="shortOption" width={190} tick={{ fill: theme.colors.textPrimary, fontSize: 13 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: theme.colors.surfaceHover }}
          contentStyle={{ background: theme.colors.background, border: `1px solid ${theme.colors.borderStrong}`, borderRadius: 10 }}
          labelStyle={{ color: theme.colors.textPrimary, fontWeight: 700 }}
          formatter={(value, _name, item) => [`${value}% · ${item.payload.count} respuestas`, "Participación"]}
          labelFormatter={(_label, payload) => payload[0]?.payload.option ?? ""}
        />
        <Bar dataKey="percent" fill={theme.colors.primary} radius={[0, 6, 6, 0]} maxBarSize={30}>
          <LabelList dataKey="percent" position="right" formatter={(value) => `${value ?? 0}%`} fill={theme.colors.textPrimary} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
