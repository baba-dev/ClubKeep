"use client";
import { ThemeProvider } from "next-themes";
export function ClubKeepThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" storageKey="ck-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
