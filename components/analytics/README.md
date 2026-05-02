# `components/analytics/`

Phase 3 **charts** on `/dashboard/analytics` (client-only; uses **Recharts**).

| File | Role |
| ---- | ---- |
| `analytics-dashboard.tsx` | Date range for category pie, wires TanStack Query hooks |
| `category-pie-chart.tsx` | Donut-style pie of summed spend per category |
| `monthly-bar-chart.tsx` | Bar chart of total spend per calendar month |

Data comes from Supabase RPCs (`@/features/analytics/use-analytics-data`).
