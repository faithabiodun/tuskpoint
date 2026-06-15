import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard - TuskPoint",
  description:
    "Interactive demo of the TuskPoint checkpoint store: inspect checkpoints, diff states, and search history.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
