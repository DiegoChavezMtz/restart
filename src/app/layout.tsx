import type { Metadata, Viewport } from "next";
import "./globals.css";
import StyledComponentsRegistry from "@/presentation/theme/StyledComponentsRegistry";
import { ThemeProvider } from "@/presentation/theme/ThemeProvider";
import { AuthProvider } from "@/presentation/state/AuthContext";

export const metadata: Metadata = {
  title: "Restart",
  description: "Dekids — sistema de formularios de evaluación",
};

// `viewportFit: "cover"` is what makes `env(safe-area-inset-*)` resolve to
// real values instead of 0 — needed by the respond flow on notched devices.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <StyledComponentsRegistry>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
