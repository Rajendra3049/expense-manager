import axios from "axios";

/**
 * Shared axios instance for non-Supabase HTTP calls (webhooks, third-party APIs, etc.).
 */
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});
