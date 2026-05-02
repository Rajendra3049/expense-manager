import type { Metadata } from "next";
import { RecurringManager } from "@/components/recurring/recurring-manager";

export const metadata: Metadata = {
  title: "Recurring",
};

export default function RecurringPage() {
  return <RecurringManager />;
}
