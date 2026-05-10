/**
 * Supabase email confirmation and OAuth redirects often append
 * `error`, `error_code`, and `error_description` to the query string and/or
 * URL fragment. Parse both and produce user-facing copy.
 */

const AUTH_NOISE_KEYS = [
  "error",
  "error_code",
  "error_description",
  "error_hint",
] as const;

export type ParsedAuthCallback =
  | { status: "error"; errorCode: string | null; description: string | null }
  | { status: "none" };

function parseFragmentParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

/** Merge query + hash; hash wins on duplicate keys (Supabase typically uses the fragment). */
export function mergeAuthCallbackParams(search: string, hash: string): URLSearchParams {
  const merged = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  parseFragmentParams(hash).forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}

export function parseAuthCallback(search: string, hash: string): ParsedAuthCallback {
  const params = mergeAuthCallbackParams(search, hash);
  const err = params.get("error");
  const code = params.get("error_code");
  const rawDesc = params.get("error_description");

  if (!err && !code && !rawDesc) {
    return { status: "none" };
  }

  let description: string | null = null;
  if (rawDesc) {
    try {
      description = decodeURIComponent(rawDesc.replace(/\+/g, " "));
    } catch {
      description = rawDesc.replace(/\+/g, " ");
    }
  }

  return {
    status: "error",
    errorCode: code,
    description,
  };
}

export function authCallbackUserMessage(parsed: Extract<ParsedAuthCallback, { status: "error" }>): string {
  switch (parsed.errorCode) {
    case "otp_expired":
      return "This confirmation link has expired or was already used. Open Create account, submit your email again to reach the verification screen, then use Resend confirmation email—or sign in if you already verified.";
    case "access_denied":
      return parsed.description ?? "We could not verify your email from this link. Try signing in, or start account creation again.";
    default:
      return parsed.description ?? "Email verification could not be completed. Try signing in, or create your account again.";
  }
}

/** Removes Supabase auth error params from search + hash; preserves other parameters. */
export function stripAuthCallbackNoise(pathname: string, search: string, hash: string): string {
  const searchParams = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  AUTH_NOISE_KEYS.forEach((k) => searchParams.delete(k));
  const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const fragment = parseFragmentParams(hash);
  AUTH_NOISE_KEYS.forEach((k) => fragment.delete(k));
  const hashStr = fragment.toString() ? `#${fragment.toString()}` : "";

  return `${pathname}${searchStr}${hashStr}`;
}
