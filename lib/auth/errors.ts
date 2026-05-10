import { AuthError } from "@supabase/supabase-js";

function formatAuthErrorMessage(rawMessage: string): string | null {
  const msg = rawMessage.toLowerCase();
  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("too many emails") ||
    msg.includes("email rate limit")
  ) {
    return "Too many verification emails were sent recently. Wait several minutes before trying again or requesting another confirmation email.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (msg.includes("user already registered")) {
    return "An account with this email already exists.";
  }
  return null;
}

export function formatAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    const mapped = formatAuthErrorMessage(error.message);
    if (mapped) {
      return mapped;
    }
    const msg = error.message.toLowerCase();
    if (msg.includes("password")) {
      return error.message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    const mapped = formatAuthErrorMessage(error.message);
    if (mapped) {
      return mapped;
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
