import type { NextConfig } from "next";

const supabaseUrl =
  process.env.SUPABASE_URL?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ??
  "";

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
  "";

const nextConfig: NextConfig = {
  // Makes SUPABASE_* available to the browser bundle (same exposure as NEXT_PUBLIC anon + URL).
  env: {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
  },
};

export default nextConfig;
