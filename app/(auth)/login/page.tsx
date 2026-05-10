import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/app-config";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${APP_NAME}`,
};

function LoginFallback() {
  return (
    <div
      className="h-96 w-full max-w-md animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
      aria-hidden
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
