"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrendRow } from "@/features/analytics/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function monthLabel(row: MonthlyTrendRow): string {
  return new Date(row.year, row.month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

type MonthlyBarChartProps = {
  data: MonthlyTrendRow[];
};

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const chartData = data.map((d) => ({
    label: monthLabel(d),
    total: d.total_amount,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No monthly data yet.
      </div>
    );
  }

  return (
    <div className="h-80 w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en-IN", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(Number(v))
            }
          />
          <Tooltip
            formatter={(value) =>
              value != null && value !== ""
                ? formatMoney(Number(value))
                : ""
            }
            labelFormatter={(label) => label}
          />
          <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Spent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
