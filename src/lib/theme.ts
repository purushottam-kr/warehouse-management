/*
 * Application-level theme (light / dark / system).
 *
 * Preference flow: localStorage -> <html class="dark"> ->
 * Tailwind `dark:` variants. The resolved value is a pure
 * function of the stored preference plus the OS setting so it
 * stays unit-testable and shared between the blocking inline
 * script (no flash) and the React provider.
 */

export const THEME_STORAGE_KEY = "wms-theme";

export type ThemePreference =
  | "light"
  | "dark"
  | "system";

export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = [
  "light",
  "dark",
  "system",
];

export const isThemePreference = (
  value: unknown,
): value is ThemePreference => {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system"
  );
};

export const resolveTheme = (
  stored: string | null,
  systemPrefersDark: boolean,
): ResolvedTheme => {
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return systemPrefersDark ? "dark" : "light";
};

/*
 * Runs synchronously in <head> before first paint so the
 * server-rendered (light) markup never flashes when the user
 * prefers dark. Kept dependency-free: no imports, no JSX.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
