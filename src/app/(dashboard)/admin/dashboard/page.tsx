"use client";

import { redirect } from "next/navigation";

// Redirection vers le dashboard personnel de l'administrateur
export default function AdminDashboardPage() {
  redirect("/dashboard?role=admin");
}
