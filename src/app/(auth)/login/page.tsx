import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string };
}) {
  return <AuthForm mode="login" redirectedFrom={searchParams.redirectedFrom} />;
}
