# `lib/` — Shared application code

Framework-agnostic **utilities**, **Supabase wiring**, and small **auth** helpers. Import using the `@/` alias (see `tsconfig.json`).

## Contents

| Path | Purpose |
| ---- | ------- |
| [`supabase/`](./supabase/README.md) | Browser client, server client (cookies), middleware session helper, env readers |
| [`auth/`](./auth/README.md) | Zod schemas, auth error formatting, safe redirect path helper |
| [`expenses/`](./expenses/) | Zod schemas and date helpers for expense/category forms |
| `http.ts` | Preconfigured **axios** instance for third-party HTTP (optional `NEXT_PUBLIC_APP_URL` as `baseURL`) |

## Import examples

```ts
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/auth/schemas";
import { http } from "@/lib/http";
```
