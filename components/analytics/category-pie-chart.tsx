"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CategoryTotalRow } from "@/features/analytics/types";

const SLICE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
];

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

type CategoryPieChartProps = {
  data: CategoryTotalRow[];
};

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = data.map((d) => ({
    name: d.category_name,
    value: d.total_amount,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No expenses in this date range to chart.
      </div>
    );
  }

  return (
    <div className="h-80 w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={96}
            paddingAngle={2}
            label={({ name, percent }) =>
              `${String(name)} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {chartData.map((_, i) => (
              <Cell
                key={String(i)}
                fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                stroke="#e4e4e7"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              value != null && value !== ""
                ? formatMoney(Number(value))
                : ""
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
