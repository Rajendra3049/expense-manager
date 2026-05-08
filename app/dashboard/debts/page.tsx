import type { Metadata } from "next";
import { DebtKhataManager } from "@/components/debts/debt-khata-manager";

export const metadata: Metadata = {
  title: "Debts",
};

export default function DebtsPage() {
  return <DebtKhataManager />;
}
