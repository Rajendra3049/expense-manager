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
      closeButton
    />
  );
}
