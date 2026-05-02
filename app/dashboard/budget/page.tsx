import type { Metadata } from "next";
import { BudgetManager } from "@/components/budget/budget-manager";

export const metadata: Metadata = {
  title: "Budget",
};

export default function BudgetPage() {
  return <BudgetManager />;
}
