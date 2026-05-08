"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAnalyticsExpenseRowsQuery,
  useCategoryTotalsQuery,
  useMonthlyTrendsQuery,
} from "@/features/analytics/use-analytics-data";
import type { AnalyticsExpenseRow } from "@/features/analytics/types";
import { getFriendlyErrorMessage } from "@/lib/errors/friendly-message";
import { toLocalDateString } from "@/lib/expenses/dates";

const CATEGORY_COLORS = [
  "#4f46e5",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0d9488",
  "#0284c7",
  "#9333ea",
];

type PresetRangeId = "30d" | "90d" | "6m" | "12m" | "ytd";

function ChartTooltip({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      {subValue ? <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{subValue}</p> : null}
    </div>
  );
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function toDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
}

function monthsAgo(to: Date, months: number): string {
  const d = new Date(to.getFullYear(), to.getMonth() - months, 1);
  return toLocalDateString(d);
}

function ytdStart(to: Date): string {
  return toLocalDateString(new Date(to.getFullYear(), 0, 1));
}

function rangeFromPreset(id: PresetRangeId): { from: string; to: string } {
  const to = new Date();
  if (id === "30d") {
    return {
      from: toLocalDateString(new Date(to.getFullYear(), to.getMonth(), to.getDate() - 29)),
      to: toLocalDateString(to),
    };
  }
  if (id === "90d") {
    return {
      from: toLocalDateString(new Date(to.getFullYear(), to.getMonth(), to.getDate() - 89)),
      to: toLocalDateString(to),
    };
  }
  if (id === "6m") return { from: monthsAgo(to, 5), to: toLocalDateString(to) };
  if (id === "ytd") return { from: ytdStart(to), to: toLocalDateString(to) };
  return { from: monthsAgo(to, 11), to: toLocalDateString(to) };
}

function inclusiveDays(from: string, to: string): number {
  const start = toDate(from);
  const end = toDate(to);
  const diff = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diff / 86_400_000) + 1;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function buildDailySeries(rows: AnalyticsExpenseRow[], from: string, to: string) {
  const start = toDate(from <= to ? from : to);
  const end = toDate(from <= to ? to : from);
  const buckets = new Map<string, number>();
  for (const row of rows) {
    buckets.set(row.date, (buckets.get(row.date) ?? 0) + row.amount);
  }

  const out: { date: string; spend: number }[] = [];
  for (
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    const key = toLocalDateString(d);
    out.push({
      date: new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
      spend: buckets.get(key) ?? 0,
    });
  }
  return out;
}

function AnalyticsChartSkeleton({ ring = false }: { ring?: boolean }) {
  return (
    <div
      className="mt-6 flex h-80 w-full flex-col items-center justify-center gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800"
      aria-busy="true"
      aria-label="Loading chart"
    >
      <Skeleton
        className={ring ? "size-40 shrink-0" : "h-48 w-11/12 max-w-3xl shrink-0"}
        rounded={ring ? "full" : "xl"}
      />
      <div className="flex w-full max-w-md flex-wrap justify-center gap-2 px-4">
        <Skeleton className="h-3 w-20" rounded="md" />
        <Skeleton className="h-3 w-24" rounded="md" />
        <Skeleton className="h-3 w-16" rounded="md" />
      </div>
    </div>
  );
}

function defaultCategoryRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return {
    from: toLocalDateString(from),
    to: toLocalDateString(to),
  };
}

export function AnalyticsDashboard() {
  const defaults = useMemo(() => defaultCategoryRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [activePreset, setActivePreset] = useState<PresetRangeId>("12m");
  const trendMonths = 12;

  const categoryQuery = useCategoryTotalsQuery(from, to);
  const trendsQuery = useMonthlyTrendsQuery(trendMonths);
  const expenseRowsQuery = useAnalyticsExpenseRowsQuery(from, to);

  const categoryError =
    categoryQuery.isError && categoryQuery.error
      ? getFriendlyErrorMessage(categoryQuery.error)
      : null;
  const trendsError =
    trendsQuery.isError && trendsQuery.error
      ? getFriendlyErrorMessage(trendsQuery.error)
      : null;
  const expenseError =
    expenseRowsQuery.isError && expenseRowsQuery.error
      ? getFriendlyErrorMessage(expenseRowsQuery.error)
      : null;

  const selectedDays = useMemo(() => inclusiveDays(from, to), [from, to]);

  const categoryData = useMemo(() => categoryQuery.data ?? [], [categoryQuery.data]);
  const detailRows = useMemo(() => expenseRowsQuery.data ?? [], [expenseRowsQuery.data]);
  const monthlyData = useMemo(() => trendsQuery.data ?? [], [trendsQuery.data]);

  const totalSpent = useMemo(
    () => categoryData.reduce((sum, row) => sum + row.total_amount, 0),
    [categoryData],
  );
  const avgPerDay = totalSpent / Math.max(selectedDays, 1);
  const projectedMonthSpend = avgPerDay * 30;

  const topCategory = categoryData[0];
  const topCategoryShare = topCategory ? (topCategory.total_amount / Math.max(totalSpent, 1)) * 100 : 0;

  const dailySeries = useMemo(() => buildDailySeries(detailRows, from, to), [detailRows, from, to]);

  const peakDay = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const row of detailRows) {
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.amount);
    }
    const entries = [...byDate.entries()].sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    return { date: entries[0][0], amount: entries[0][1] };
  }, [detailRows]);

  const weekdaySeries = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = new Array<number>(7).fill(0);
    for (const row of detailRows) {
      totals[toDate(row.date).getDay()] += row.amount;
    }
    return labels.map((label, i) => ({
      day: label,
      amount: totals[i],
      avg: totals[i] / Math.max(1, Math.ceil(selectedDays / 7)),
    }));
  }, [detailRows, selectedDays]);

  const monthlyWithDelta = useMemo(() => {
    return monthlyData.map((row, idx) => {
      const prev = idx > 0 ? monthlyData[idx - 1].total_amount : 0;
      const delta = prev > 0 ? ((row.total_amount - prev) / prev) * 100 : 0;
      return {
        label: monthLabel(row.year, row.month),
        total: row.total_amount,
        delta,
      };
    });
  }, [monthlyData]);

  const latestMonth = monthlyWithDelta.at(-1);

  const insightLines = useMemo(() => {
    const lines: string[] = [];
    if (latestMonth) {
      const direction = latestMonth.delta >= 0 ? "up" : "down";
      lines.push(`Monthly momentum is ${direction} ${formatPct(Math.abs(latestMonth.delta))} vs previous month.`);
    }
    if (topCategory) {
      lines.push(
        `${topCategory.category_name} contributes ${formatPct(topCategoryShare)} of spending in this range.`,
      );
    }
    if (peakDay) {
      lines.push(
        `Highest spend day is ${new Date(peakDay.date).toLocaleDateString()} at ${formatMoney(peakDay.amount)}.`,
      );
    }
    const activeDays = dailySeries.filter((d) => d.spend > 0).length;
    const cadence = (activeDays / Math.max(selectedDays, 1)) * 100;
    lines.push(`Spending happened on ${activeDays}/${selectedDays} days (${formatPct(cadence)} activity cadence).`);
    return lines.slice(0, 4);
  }, [dailySeries, latestMonth, peakDay, selectedDays, topCategory, topCategoryShare]);

  const presetButtonClass =
    "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Analytics
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Understand spending trends, category mix, daily behavior, and projected
          run-rate from one analytics view.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-zinc-50 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="analytics-from"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                From
              </label>
              <input
                id="analytics-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset("12m");
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label
                htmlFor="analytics-to"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                To
              </label>
              <input
                id="analytics-to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset("12m");
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { const r = rangeFromPreset("30d"); setFrom(r.from); setTo(r.to); setActivePreset("30d"); }}
              className={`${presetButtonClass} ${activePreset === "30d" ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400/70 dark:bg-indigo-500/15 dark:text-indigo-200" : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"}`}
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => { const r = rangeFromPreset("90d"); setFrom(r.from); setTo(r.to); setActivePreset("90d"); }}
              className={`${presetButtonClass} ${activePreset === "90d" ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400/70 dark:bg-indigo-500/15 dark:text-indigo-200" : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"}`}
            >
              90D
            </button>
            <button
              type="button"
              onClick={() => { const r = rangeFromPreset("6m"); setFrom(r.from); setTo(r.to); setActivePreset("6m"); }}
              className={`${presetButtonClass} ${activePreset === "6m" ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400/70 dark:bg-indigo-500/15 dark:text-indigo-200" : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"}`}
            >
              6M
            </button>
            <button
              type="button"
              onClick={() => { const r = rangeFromPreset("12m"); setFrom(r.from); setTo(r.to); setActivePreset("12m"); }}
              className={`${presetButtonClass} ${activePreset === "12m" ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400/70 dark:bg-indigo-500/15 dark:text-indigo-200" : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"}`}
            >
              12M
            </button>
            <button
              type="button"
              onClick={() => { const r = rangeFromPreset("ytd"); setFrom(r.from); setTo(r.to); setActivePreset("ytd"); }}
              className={`${presetButtonClass} ${activePreset === "ytd" ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400/70 dark:bg-indigo-500/15 dark:text-indigo-200" : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"}`}
            >
              YTD
            </button>
          </div>
        </div>
      </section>

      {categoryError || trendsError || expenseError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          <p role="alert">{categoryError ?? trendsError ?? expenseError}</p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Spend</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{formatMoney(totalSpent)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg / Day</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{formatMoney(avgPerDay)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">30-Day Run Rate</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{formatMoney(projectedMonthSpend)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Top Category Share</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{formatPct(topCategoryShare)}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{topCategory?.category_name ?? "No category data"}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Peak Spending Day</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{peakDay ? formatMoney(peakDay.amount) : formatMoney(0)}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{peakDay ? new Date(peakDay.date).toLocaleDateString() : "No day data"}</p>
            </div>
          </section>

      <section className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-indigo-50/30 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Daily spend trend</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Every day in selected range, including zero-spend days.</p>
            {expenseRowsQuery.isLoading ? (
              <AnalyticsChartSkeleton />
            ) : (
              <div className="mt-6 h-80 w-full min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries} margin={{ top: 8, right: 16, left: 8, bottom: 6 }}>
                    <defs>
                      <linearGradient id="dailySpendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis dataKey="date" minTickGap={28} tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => formatCompact(Number(value))}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <ChartTooltip
                            label={`Date: ${String(label)}`}
                            value={formatMoney(Number(payload[0].value))}
                          />
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#4f46e5"
                      fillOpacity={1}
                      fill="url(#dailySpendFill)"
                      strokeWidth={2}
                      activeDot={{ r: 4, strokeWidth: 0, fill: "#4338ca" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-5">
            <div className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-purple-50/30 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900 sm:p-6 xl:col-span-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Category intelligence</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Understand concentration, category dominance, and diversification.</p>
              {categoryQuery.isLoading ? (
                <AnalyticsChartSkeleton ring />
              ) : (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData.map((row) => ({ name: row.category_name, value: row.total_amount }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={92}
                          paddingAngle={2}
                        >
                          {categoryData.map((_, idx) => (
                            <Cell key={String(idx)} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <ChartTooltip
                                label={String(payload[0].name ?? "Category")}
                                value={formatMoney(Number(payload[0].value))}
                              />
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {categoryData.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        No category distribution in this range.
                      </p>
                    ) : (
                      categoryData.slice(0, 6).map((item, idx) => {
                        const share = (item.total_amount / Math.max(totalSpent, 1)) * 100;
                        return (
                          <div key={item.category_id} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-zinc-700 dark:text-zinc-200">{item.category_name}</span>
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {formatMoney(item.total_amount)} ({formatPct(share)})
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(share, 100)}%`,
                                  backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-cyan-50/25 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900 sm:p-6 xl:col-span-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Smart insights</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Generated from your selected date range and 12-month history.</p>
              <ul className="mt-5 space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
                {insightLines.map((line) => (
                  <li key={line} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-teal-50/30 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900 sm:p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Weekday behavior</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Average spend pattern across weekdays in selected range.</p>
              {expenseRowsQuery.isLoading ? (
                <AnalyticsChartSkeleton />
              ) : (
                <div className="mt-6 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdaySeries} margin={{ top: 8, right: 16, left: 8, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => formatCompact(Number(value))} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const dataPoint = payload[0].payload as { avg: number };
                          return (
                            <ChartTooltip
                              label={`Weekday: ${String(label)}`}
                              value={`${formatMoney(Number(payload[0].value))} total`}
                              subValue={`${formatMoney(dataPoint.avg)} avg`}
                            />
                          );
                        }}
                      />
                      <Bar dataKey="amount" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-rose-50/25 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900 sm:p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Monthly momentum</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Last {trendMonths} months with month-over-month direction.</p>
              {trendsQuery.isLoading ? (
                <AnalyticsChartSkeleton />
              ) : (
                <div className="mt-6 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyWithDelta} margin={{ top: 8, right: 16, left: 8, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-32} textAnchor="end" height={56} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => formatCompact(Number(value))} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const dataPoint = payload[0].payload as { delta: number };
                          return (
                            <ChartTooltip
                              label={`Month: ${String(label)}`}
                              value={formatMoney(Number(payload[0].value))}
                              subValue={`MoM: ${formatPct(dataPoint.delta)}`}
                            />
                          );
                        }}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {monthlyWithDelta.map((m) => (
                          <Cell key={m.label} fill={m.delta >= 0 ? "#ef4444" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
