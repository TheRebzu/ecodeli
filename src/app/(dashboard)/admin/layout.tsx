import { ReactNode } from "react";
import { redirect } from "next/navigation";

// Ce layout est désormais obsolète avec la nouvelle organisation
// Redirection vers la nouvelle route d'administration centrale
export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  redirect("/admin");
} 