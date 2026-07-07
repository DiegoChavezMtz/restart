"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTheme } from "styled-components";
import type { SkillProfileEntry } from "@/presentation/services/statsService";

export interface ParticipantSkillRadarProps {
  profile: SkillProfileEntry[];
}

// Single series (one participant's profile for one form) — one hue, no
// legend needed, per dataviz guidance for a single-series chart.
export function ParticipantSkillRadar({ profile }: ParticipantSkillRadarProps) {
  const theme = useTheme();
  const data = profile.map((entry) => ({
    skill: entry.skill.name,
    value: entry.averagePercent,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke={theme.colors.border} />
        <PolarAngleAxis dataKey="skill" tick={{ fill: theme.colors.textSecondary, fontSize: 12 }} />
        <PolarRadiusAxis
          domain={[0, 100]}
          tick={{ fill: theme.colors.textSecondary, fontSize: 10 }}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 8,
          }}
          labelStyle={{ color: theme.colors.textPrimary }}
          formatter={(value) => [`${value}%`, "Nivel"]}
        />
        <Radar
          dataKey="value"
          stroke={theme.colors.primary}
          fill={theme.colors.primary}
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
