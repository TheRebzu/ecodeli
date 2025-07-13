"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  FileText,
  Calendar,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FinancialDashboard } from "@/features/merchant/components/finances/financial-dashboard";

export default function FinancialManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Financial Management</h1>
        <p className="text-muted-foreground">
          Track your revenue, payments, commissions, and financial performance
        </p>
      </div>

      <FinancialDashboard />
    </div>
  );
}
