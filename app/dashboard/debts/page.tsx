import type { Metadata } from "next";
import { DebtManager } from "@/components/debts/debt-manager";

export const metadata: Metadata = {
  title: "Debts",
};

export default function DebtsPage() {
  return <DebtManager />;
}
