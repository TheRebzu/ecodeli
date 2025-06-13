import { Metadata } from "next";
import { DashboardOverview } from "@/components/admin/dashboard/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard | EcoDeli",
  description: "Dashboard administrateur de la plateforme EcoDeli",
};

export default function AdminDashboardPage() {
  return (
    <div className="container py-6">
      <DashboardOverview />
    </div>
  );
}
