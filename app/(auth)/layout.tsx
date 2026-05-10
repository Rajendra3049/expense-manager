import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggleButton />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
