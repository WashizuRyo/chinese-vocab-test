"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { type Theme, themeStorageKey, themes } from "@/lib/theme";

declare global {
  interface Window {
    _updateTheme: (theme: Theme) => void;
  }
}

const themeOptions = [
  { value: "system", label: "システム設定", Icon: Monitor },
  { value: "light", label: "ライトモード", Icon: Sun },
  { value: "dark", label: "ダークモード", Icon: Moon },
] as const;

function isTheme(value: string | null): value is Theme {
  return value !== null && themes.some((theme) => theme === value);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem(themeStorageKey);
    setTheme(isTheme(storedTheme) ? storedTheme : "system");
  }, []);

  const handleChange = (nextTheme: Theme) => {
    localStorage.setItem(themeStorageKey, nextTheme);
    window._updateTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <fieldset className="inline-grid grid-cols-3 gap-0.5 rounded-full bg-muted p-1">
      <legend className="sr-only">表示テーマ</legend>
      {themeOptions.map(({ value, label, Icon }) => (
        <label
          key={value}
          title={label}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={() => handleChange(value)}
            className="sr-only"
            aria-label={label}
          />
          <Icon aria-hidden="true" className="size-4" />
        </label>
      ))}
    </fieldset>
  );
}
