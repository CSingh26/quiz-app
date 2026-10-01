"use client";
import { createContext, useContext, useEffect, useState } from "react";
type Theme = "light" | "dark" | "system";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: "system", setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);
export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const saved = localStorage.getItem("quizbee-theme");
    if (saved === "light" || saved === "dark" || saved === "system")
      setTheme(saved);
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (query.matches ? "dark" : "light") : theme;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: (value) => {
          localStorage.setItem("quizbee-theme", value);
          setTheme(value);
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
