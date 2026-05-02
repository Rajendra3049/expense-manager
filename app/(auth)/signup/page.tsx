import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Sign up for Expense Manager",
};

export default function SignupPage() {
  return <SignupForm />;
}
