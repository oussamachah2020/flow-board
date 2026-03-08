import * as React from "react";
import { authApi } from "~/lib/auth-api";
import { useAuthStore } from "~/stores/auth.store";
import { useThemeStore } from "~/stores/theme.store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  React.useEffect(() => {
    if (!accessToken) return;
    authApi
      .getMe()
      .then((r) => {
        const t = r.data?.profile?.theme;
        if (t === "light" || t === "dark") setTheme(t);
      })
      .catch(() => {
        setTheme("dark");
      });
  }, [accessToken, setTheme]);

  return <>{children}</>;
}
