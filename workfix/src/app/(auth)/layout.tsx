import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Okestria",
  description: "Sign in to your Okestria account to access your AI agent dashboard.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
