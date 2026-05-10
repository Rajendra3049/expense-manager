"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formatAuthError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { type SignupFormValues, signupSchema } from "@/lib/auth/schemas";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/** Survives React Strict Mode remounts in dev so the post-signup screen does not snap back to the form. */
const SIGNUP_PENDING_EMAIL_KEY = "em-signup-pending-email";

function readPendingSignupEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = sessionStorage.getItem(SIGNUP_PENDING_EMAIL_KEY);
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

function persistPendingSignupEmail(email: string) {
  try {
    sessionStorage.setItem(SIGNUP_PENDING_EMAIL_KEY, email.trim());
  } catch {
    /* ignore quota / private mode */
  }
}

function clearPendingSignupEmail() {
  try {
    sessionStorage.removeItem(SIGNUP_PENDING_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  useLayoutEffect(() => {
    const pending = readPendingSignupEmail();
    if (!pending) {
      return;
    }
    queueMicrotask(() => setVerificationEmail(pending));
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setFormError(formatAuthError(error));
      return;
    }

    if (data.session) {
      clearPendingSignupEmail();
      router.refresh();
      router.push(safeNextPath(undefined));
      return;
    }

    reset({
      email: "",
      password: "",
      confirmPassword: "",
    });
    const trimmed = values.email.trim();
    persistPendingSignupEmail(trimmed);
    setVerificationEmail(trimmed);
  });

  async function handleResend() {
    if (!verificationEmail) {
      return;
    }
    setResendBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: verificationEmail,
    });
    setResendBusy(false);

    if (error) {
      toast.error(formatAuthError(error));
      return;
    }

    toast.success("Confirmation email sent. Check your inbox.");
  }

  if (verificationEmail) {
    return (
      <div className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Verify your email
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            We sent a confirmation link to{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{verificationEmail}</span>.
            Use the link to activate your account, then sign in.
          </p>
        </div>

        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          If you do not see the message within a few minutes, check spam or promotions folders.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={resendBusy}
            title={resendBusy ? "Sending confirmation email…" : "Send another confirmation email"}
            aria-busy={resendBusy}
            onClick={() => void handleResend()}
            className="flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {resendBusy ? "Sending…" : "Resend confirmation email"}
          </button>

          <Link
            href="/login"
            className="flex h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Continue to sign in
          </Link>
        </div>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Wrong email?{" "}
          <button
            type="button"
            onClick={() => {
              clearPendingSignupEmail();
              setVerificationEmail(null);
              setFormError(null);
              reset({ email: "", password: "", confirmPassword: "" });
            }}
            className="cursor-pointer font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            Start over
          </button>
        </p>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already verified?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8"
      noValidate
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create account
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sign up with email and password.
        </p>
      </div>

      {formError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-email"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-password"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-confirm"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Confirm password
        </label>
        <input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        title={isSubmitting ? "Creating your account…" : undefined}
        className="mt-1 flex h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting ? "Creating account…" : "Sign up"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="cursor-pointer font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
