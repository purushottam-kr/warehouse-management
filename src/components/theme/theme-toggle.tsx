"use client";

import {
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";
import { useTheme } from "./theme-provider";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  hint: string;
  Icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Light",
    hint: "Always use the light theme",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    hint: "Always use the dark theme",
    Icon: Moon,
  },
  {
    value: "system",
    label: "System",
    hint: "Follow the OS setting",
    Icon: Monitor,
  },
];

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  const ActiveIcon =
    OPTIONS.find((option) => option.value === theme)
      ?.Icon ?? Monitor;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Change theme"
        title="Change theme"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <ActiveIcon className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                theme === option.value
                  ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              )}
            >
              <option.Icon className="h-4 w-4 shrink-0" />

              <span>
                <span className="block leading-5">
                  {option.label}
                </span>

                <span className="block text-xs font-normal text-neutral-400 dark:text-neutral-500">
                  {option.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
