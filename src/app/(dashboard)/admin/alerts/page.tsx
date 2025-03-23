import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertHistory } from "@/components/admin/alerts/alert-history";
import { AlertRules } from "@/components/admin/alerts/alert-rules";
import { Bell, BellRing, Settings } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin - Alertes | EcoDeli",
  description: "Gestion des alertes et notifications",
};

export default function AdminAlertsPage() {
  // Redirect to the centralized admin panel alerts page
  redirect("/admin/alerts");
} 