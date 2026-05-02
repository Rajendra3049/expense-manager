import type { Metadata } from "next";
import { AccountManager } from "@/components/accounts/account-manager";

export const metadata: Metadata = {
  title: "Accounts",
};

export default function AccountsPage() {
  return <AccountManager />;
}
