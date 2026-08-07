"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "styled-components";
import type { LikertBreakdown } from "@/presentation/services/statsService";

export interface LikertDistributionChartProps { breakdown: LikertBreakdown; }

export function LikertDistributionChart({ breakdown }: LikertDistributionChartProps) {
  const theme = useTheme();
  const data = breakdown.distribution.map((point) => ({ value: String(point.value), count: point.count }));

  return (
    <ResponsiveContainer width="100%" height={268}>
      <BarChart data={data} margin={{ top: 28, right: 12, bottom: 8, left: -16 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke={theme.colors.border} strokeDasharray="3 3" />
        <XAxis dataKey="value" tick={{ fill: theme.colors.textPrimary, fontSize: 13 }} axisLine={false} tickLine={false} label={{ value: "Valor de la escala", position: "insideBottom", offset: -2, fill: theme.colors.textSecondary, fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: theme.colors.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: theme.colors.background, border: `1px solid ${theme.colors.borderStrong}`, borderRadius: 10 }} labelStyle={{ color: theme.colors.textPrimary, fontWeight: 700 }} formatter={(value) => [`${value} respuestas`, "Total"]} />
        <Bar dataKey="count" fill={theme.colors.accentPurple} radius={[6, 6, 0, 0]} maxBarSize={44}>
          <LabelList dataKey="count" position="top" fill={theme.colors.textPrimary} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
