import type { Metadata } from "next";
import { ExpenseManager } from "@/components/expenses/expense-manager";

export const metadata: Metadata = {
  title: "Dashboard — Expenses",
};

export default function DashboardPage() {
  return <ExpenseManager />;
}
