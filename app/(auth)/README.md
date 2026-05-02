# Route group: `(auth)`

The parentheses mean this segment **does not** appear in the URL. It only **groups** the login and signup routes under one layout.

| Child | Public URL |
| ----- | ---------- |
| `login/page.tsx` | `/login` |
| `signup/page.tsx` | `/signup` |

`layout.tsx` in this folder provides the centered auth page shell (background and padding). Middleware redirects authenticated users away from these paths toward the dashboard (or a safe `?next=` path).
