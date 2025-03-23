import { redirect } from "next/navigation";

export default function DashboardAdminUsersPage() {
  // Redirect to the centralized admin panel version of the users page
  redirect("/admin/users");
} 