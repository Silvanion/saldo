import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "auto" | any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("saldo_theme");
      if (stored === "system") return "auto";
      return (stored as "light" | "dark" | "auto") || "auto";
    }
    return "auto";
  });

  const handleThemeChange = (newTheme: "light" | "dark" | "auto") => {
    setTheme(newTheme);
    localStorage.setItem("saldo_theme", newTheme);
  };

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let isDark = false;

      if (theme === "dark") {
        isDark = true;
      } else if (theme === "light") {
        isDark = false;
      } else {
        const currentHour = new Date().getHours();
        isDark = currentHour >= 18 || currentHour < 6;
      }

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (theme === "auto") {
      const interval = setInterval(applyTheme, 60000);
      return () => clearInterval(interval);
    }
  }, [theme]);

  return { theme, handleThemeChange };
}
