"use client";

import type { ReactNode } from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { themes, type ThemeName } from "./themes";

export function ThemeProvider({
  themeName = "default",
  children,
}: {
  themeName?: ThemeName;
  children: ReactNode;
}) {
  return (
    <StyledThemeProvider theme={themes[themeName]}>
      {children}
    </StyledThemeProvider>
  );
}
