"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "styled-components";
import type { ChoiceBreakdown } from "@/presentation/services/statsService";

export interface OptionPercentageChartProps {
  breakdown: ChoiceBreakdown;
}

// Single series (percent per option) — checkbox percentages don't sum to
// 100%, so this is a plain magnitude comparison, never a part-to-whole /
// stacked treatment (that would misstate multi-select data).
export function OptionPercentageChart({ breakdown }: OptionPercentageChartProps) {
  const theme = useTheme();
  const data = breakdown.optionPercentages.map((o) => ({ option: o.option, percent: o.percent }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" barCategoryGap="20%">
        <CartesianGrid horizontal={false} stroke={theme.colors.border} strokeDasharray="0" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: theme.colors.textSecondary, fontSize: 12 }}
          axisLine={{ stroke: theme.colors.border }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="option"
          width={120}
          tick={{ fill: theme.colors.textSecondary, fontSize: 12 }}
          axisLine={{ stroke: theme.colors.border }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 8,
          }}
          labelStyle={{ color: theme.colors.textPrimary }}
          formatter={(value) => [`${value}%`, "Porcentaje"]}
        />
        <Bar dataKey="percent" fill={theme.colors.primary} radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
