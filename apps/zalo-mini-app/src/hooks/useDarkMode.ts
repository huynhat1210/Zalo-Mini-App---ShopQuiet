import { useEffect } from "react";

type Theme = "light";

const THEME_KEY = "shopquiet_theme";

export function useDarkMode(): [Theme, () => void] {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    try {
      localStorage.removeItem(THEME_KEY);
    } catch (e) {}
  }, []);

  return ["light", () => {}];
}
