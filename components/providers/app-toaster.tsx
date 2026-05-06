"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";

export function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      theme={theme}
      closeButton={false}
      expand={false}
      visibleToasts={3}
      toastOptions={{
        duration: 4500,
        classNames: {
          toast:
            "rounded-2xl border px-4 py-3 backdrop-blur-md shadow-2xl",
          title: "text-sm font-medium leading-6",
          description: "text-xs opacity-80",
          default:
            "bg-white/95 text-zinc-900 border-zinc-200 dark:bg-zinc-950/92 dark:text-zinc-100 dark:border-zinc-700/80",
          success:
            "bg-emerald-50/95 text-emerald-950 border-emerald-300 dark:bg-emerald-950/45 dark:text-emerald-100 dark:border-emerald-500/65",
          info:
            "bg-sky-50/95 text-sky-950 border-sky-300 dark:bg-sky-950/45 dark:text-sky-100 dark:border-sky-500/65",
          error:
            "bg-red-50/95 text-red-950 border-red-300 dark:bg-red-950/55 dark:text-red-100 dark:border-red-500/70",
        },
        style: {
          boxShadow:
            theme === "dark"
              ? "0 14px 34px rgba(0, 0, 0, 0.45)"
              : "0 12px 28px rgba(0, 0, 0, 0.14)",
        },
      }}
    />
  );
}
