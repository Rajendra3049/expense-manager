import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { APP_NAME } from "@/lib/app-config";

export const metadata: Metadata = {
  title: "Create account",
  description: `Sign up for ${APP_NAME}`,
};

export default function SignupPage() {
  return <SignupForm />;
}
