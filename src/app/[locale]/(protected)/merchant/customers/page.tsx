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
  Mail,
  Phone,
  Calendar,
  ShoppingCart,
  DollarSign,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CustomerManagementTable } from "@/features/merchant/components/customers/customer-management-table";

export default function CustomerManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <p className="text-muted-foreground">
          Manage your customer database, view order history, and analyze
          customer behavior
        </p>
      </div>

      <CustomerManagementTable />
    </div>
  );
}
