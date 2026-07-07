import { defaultTheme } from "./default.theme";

// Theme registry — add new themes here (e.g. `dark: darkTheme`) to make them
// selectable by name via ThemeProvider.
export const themes = {
  default: defaultTheme,
} as const;

export type ThemeName = keyof typeof themes;
