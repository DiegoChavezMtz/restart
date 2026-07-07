"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "styled-components";
import type { LikertBreakdown } from "@/presentation/services/statsService";

export interface LikertDistributionChartProps {
  breakdown: LikertBreakdown;
}

// Single series (one hue, magnitude across the scale) — no legend needed,
// per dataviz guidance: a single series carries its label via the axis/title.
export function LikertDistributionChart({ breakdown }: LikertDistributionChartProps) {
  const theme = useTheme();
  const data = breakdown.distribution.map((point) => ({
    value: String(point.value),
    count: point.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={theme.colors.border} strokeDasharray="0" />
        <XAxis
          dataKey="value"
          tick={{ fill: theme.colors.textSecondary, fontSize: 12 }}
          axisLine={{ stroke: theme.colors.border }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
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
        />
        <Bar dataKey="count" fill={theme.colors.primary} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
