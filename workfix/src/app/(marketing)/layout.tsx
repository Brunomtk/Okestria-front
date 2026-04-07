import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Okestria - Orchestrate AI Agents Like Never Before",
  description:
    "Build, deploy, and scale AI-powered workflows that transform how your business operates. Intelligent automation made simple.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
