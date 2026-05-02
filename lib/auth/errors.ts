import { AuthError } from "@supabase/supabase-js";

export function formatAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (msg.includes("email not confirmed")) {
      return "Please confirm your email before signing in.";
    }
    if (msg.includes("user already registered")) {
      return "An account with this email already exists.";
    }
    if (msg.includes("password")) {
      return error.message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
