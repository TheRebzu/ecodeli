import { redirect } from "next/navigation";

export default function AdminMerchantsPage() {
  // Redirect to the future centralized admin panel merchants page
  redirect("/admin/merchants");
}