import { rawColors } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

// This is the only place raw color literals are referenced. All components
// consume `props.theme.colors.<semanticName>` — never `rawColors` directly.
export const defaultTheme = {
  name: "default",
  colors: {
    primary: rawColors.brand.coral,
    primaryHover: rawColors.brand.coralHover,
    background: rawColors.neutral.bg,
    surface: rawColors.neutral.surface,
    surfaceElevated: rawColors.neutral.surfaceElevated,
    textPrimary: rawColors.neutral.textPrimary,
    textSecondary: rawColors.neutral.textSecondary,
    border: rawColors.neutral.border,
    accentCyan: rawColors.accent.cyan,
    accentPurple: rawColors.accent.purple,
    success: rawColors.feedback.success,
    // "danger" is a distinct semantic role from "primary", but this palette
    // reuses the same coral for both — see docs/CONSTITUCION.md theming notes.
    error: rawColors.brand.coral,
    warning: rawColors.feedback.warning,
  },
  spacing,
  typography,
} as const;
