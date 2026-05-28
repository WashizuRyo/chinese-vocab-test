"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "white" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = "chinese-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(value: string | null): Theme | null {
  if (value === "dark" || value === "white") return value;
  if (value === "light") return "white";
  return null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "white";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "white";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("white");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const storedTheme = getStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    const initialTheme = storedTheme ?? getSystemTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, initialTheme);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [initialized, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
