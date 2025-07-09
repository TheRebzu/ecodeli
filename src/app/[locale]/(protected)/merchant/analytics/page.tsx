"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MerchantAnalyticsDashboard } from "@/features/merchant/components/analytics/merchant-analytics-dashboard";

export default function MerchantAnalyticsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive business intelligence and performance metrics
        </p>
      </div>
      
      <MerchantAnalyticsDashboard />
    </div>
  );
} 