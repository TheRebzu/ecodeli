import { redirect } from "next/navigation";

export default function AdminAnnouncementsPage() {
  // Redirect to the centralized admin panel announcements page
  redirect("/admin/announcements");
} 