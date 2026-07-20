import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId = "classic" | "challenger" | "neon" | "frost" | "tron";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  /** Small swatch used in the picker (accent + background). */
  swatch: { primary: string; background: string };
}

export const THEMES: ThemeOption[] = [
  {
    id: "classic",
    name: "Classic Dark",
    description: "The calm, focused BotDiff default.",
    swatch: { primary: "oklch(0.62 0.17 255)", background: "oklch(0.16 0.008 265)" },
  },
  {
    id: "challenger",
    name: "Challenger Blue",
    description: "Deep navy with vivid competitive blue.",
    swatch: { primary: "oklch(0.66 0.19 250)", background: "oklch(0.15 0.03 258)" },
  },
  {
    id: "neon",
    name: "Neon",
    description: "Electric magenta energy on near-black.",
    swatch: { primary: "oklch(0.68 0.26 330)", background: "oklch(0.13 0.02 300)" },
  },
  {
    id: "frost",
    name: "Frost / Glass",
    description: "Cool, airy, high-clarity glass.",
    swatch: { primary: "oklch(0.72 0.11 220)", background: "oklch(0.22 0.02 235)" },
  },
  {
    id: "tron",
    name: "Light Cycle",
    description: "Jet-black arena traced by electric cyan light-cycle glow.",
    swatch: { primary: "oklch(0.82 0.16 210)", background: "oklch(0.11 0.015 230)" },
  },
];

export const THEME_STORAGE_KEY = "botdiff-theme";

function isThemeId(v: string | null): v is ThemeId {
  return (
    v === "classic" ||
    v === "challenger" ||
    v === "neon" ||
    v === "frost" ||
    v === "tron"
  );
}

/**
 * Inline script injected before paint so the saved theme is applied without a
 * flash of the default palette. Kept as a string for the SSR shell <head>.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&t!=='classic'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (theme === "classic") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", theme);
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("classic");

  // Hydrate from localStorage on mount (client-only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeId(saved)) {
        setThemeState(saved);
        applyTheme(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
