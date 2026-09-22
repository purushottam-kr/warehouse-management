import { describe, expect, test } from "vitest";

import {
  isThemePreference,
  resolveTheme,
  THEME_INIT_SCRIPT,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

describe("isThemePreference", () => {
  test("accepts the three supported preferences", () => {
    expect(THEME_PREFERENCES).toEqual([
      "light",
      "dark",
      "system",
    ]);

    for (const preference of THEME_PREFERENCES) {
      expect(isThemePreference(preference)).toBe(true);
    }
  });

  test("rejects anything else", () => {
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference("")).toBe(false);
    expect(isThemePreference("DARK")).toBe(false);
    expect(isThemePreference("auto")).toBe(false);
  });
});

describe("resolveTheme", () => {
  test("explicit preferences win over the OS setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("system follows the OS setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  test("missing or corrupt values fall back to the OS setting", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("DARK", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  test("stays in sync with the provider logic", () => {
    expect(THEME_INIT_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_INIT_SCRIPT).toContain(
      "prefers-color-scheme: dark",
    );
    expect(THEME_INIT_SCRIPT).toContain(
      'classList.toggle("dark"',
    );
    expect(THEME_INIT_SCRIPT).not.toContain("import");
  });
});
