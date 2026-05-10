import Link from "next/link";
import { AuthCallbackNotice } from "@/components/auth/auth-callback-notice";
import { BrandMark } from "@/components/branding/brand-mark";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <Link
          href="/"
          aria-label="Home"
          className="inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <BrandMark size="sm" />
        </Link>
      </div>
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggleButton />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <AuthCallbackNotice />
          {children}
        </div>
      </div>
    </div>
  );
}
