import type { Metadata } from "next";
import { InvestmentManager } from "@/components/investments/investment-manager";

export const metadata: Metadata = {
  title: "Investments",
};

export default function InvestmentsPage() {
  return <InvestmentManager />;
}
