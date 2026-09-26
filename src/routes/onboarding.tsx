import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { applyThemePreference, loadUserPreferences } from "@/lib/user-preferences";

export const Route = createFileRoute("/onboarding")({ component: OnboardingLayout });

function OnboardingLayout() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
    return () => applyThemePreference(loadUserPreferences().theme);
  }, []);

  return <Outlet />;
}
