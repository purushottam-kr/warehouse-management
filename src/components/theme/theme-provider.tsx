"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext =
  createContext<ThemeContextValue | null>(null);

const applyResolvedTheme = (
  resolved: ResolvedTheme,
) => {
  document.documentElement.classList.toggle(
    "dark",
    resolved === "dark",
  );
};

const readStoredTheme = (): ThemePreference => {
  try {
    const stored = window.localStorage.getItem(
      THEME_STORAGE_KEY,
    );

    if (isThemePreference(stored)) {
      return stored;
    }
  } catch {
    /* Storage unavailable: fall back to system. */
  }

  return "system";
};

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({
  children,
}: ThemeProviderProps) => {
  const [theme, setThemeState] =
    useState<ThemePreference>("system");

  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTheme>("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );

    const sync = () => {
      const stored = readStoredTheme();

      setThemeState(stored);

      const resolved = resolveTheme(
        stored === "system" ? null : stored,
        mediaQuery.matches,
      );

      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    };

    sync();

    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      try {
        window.localStorage.setItem(
          THEME_STORAGE_KEY,
          next,
        );
      } catch {
        /* Preference applies for this session only. */
      }

      const resolved = resolveTheme(
        next === "system" ? null : next,
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches,
      );

      setThemeState(next);
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    },
    [],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within a ThemeProvider.",
    );
  }

  return context;
};
