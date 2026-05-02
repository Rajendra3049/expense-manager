import type { Metadata } from "next";
import { EmiManager } from "@/components/emis/emi-manager";

export const metadata: Metadata = {
  title: "EMIs",
};

export default function EmisPage() {
  return <EmiManager />;
}
