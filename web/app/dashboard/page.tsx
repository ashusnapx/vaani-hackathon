import type { Metadata } from "next";
import Dashboard from "./dashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[96rem] px-4 sm:px-8">
      <Dashboard />
    </div>
  );
}
