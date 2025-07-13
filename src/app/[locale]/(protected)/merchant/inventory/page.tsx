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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Download,
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { InventoryManagementTable } from "@/features/merchant/components/inventory/inventory-management-table";

export default function InventoryManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground">
          Manage your product catalog, track stock levels, and monitor product
          performance
        </p>
      </div>

      <InventoryManagementTable />
    </div>
  );
}
