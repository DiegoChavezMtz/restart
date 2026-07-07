// Raw palette only — no semantic names. Never import this directly from
// atoms/molecules/organisms; consume colors via `props.theme.colors.*` instead.
export const rawColors = {
  neutral: {
    bg: "#0A0A10",
    surface: "#14141C",
    surfaceElevated: "#1A1A24",
    border: "#2A2A35",
    textPrimary: "#F5F5F7",
    textSecondary: "#9A9AA5",
  },
  brand: {
    coral: "#E8384F",
    coralHover: "#C53043",
  },
  accent: {
    cyan: "#3EC6F0",
    purple: "#8B6FF5",
  },
  feedback: {
    success: "#4ADE80",
    warning: "#F59E0B",
  },
} as const;
