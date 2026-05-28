"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <fieldset className="grid h-9 shrink-0 grid-cols-2 items-center rounded-full border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-xs font-semibold text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
      <legend className="sr-only">テーマ</legend>
      <ThemeOption
        active={theme === "white"}
        ariaLabel="ホワイトテーマ"
        theme="white"
        onClick={() => setTheme("white")}
      />
      <ThemeOption
        active={theme === "dark"}
        ariaLabel="ダークテーマ"
        theme="dark"
        onClick={() => setTheme("dark")}
      />
    </fieldset>
  );
}

function ThemeOption({
  active,
  ariaLabel,
  theme,
  onClick,
}: {
  active: boolean;
  ariaLabel: string;
  theme: "white" | "dark";
  onClick: () => void;
}) {
  const Icon = ariaLabel === "ホワイトテーマ" ? SunIcon : MoonIcon;
  const activeClass =
    theme === "white"
      ? "bg-white text-zinc-950 shadow-sm"
      : "bg-zinc-900 text-white shadow-sm dark:bg-zinc-900 dark:text-white";

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`h-7 min-w-12 rounded-full px-2.5 leading-none transition-colors ${
        active
          ? activeClass
          : "text-zinc-500 active:bg-white/60 dark:text-zinc-400 dark:active:bg-zinc-800"
      }`}
    >
      <Icon />
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      className="mx-auto h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      className="mx-auto h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z" />
    </svg>
  );
}
