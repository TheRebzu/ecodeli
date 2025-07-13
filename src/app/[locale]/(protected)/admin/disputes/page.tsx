"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { DisputesList } from "@/features/admin/components/disputes/disputes-list";
import { DisputesDashboard } from "@/features/admin/components/disputes/disputes-dashboard";

export default function AdminDisputesPage() {
  const t = useTranslations("admin.disputes");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("refresh")}
        </Button>
      </div>

      {/* Dashboard Stats */}
      <DisputesDashboard />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("statusFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="OPEN">{t("open")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t("inProgress")}</SelectItem>
                <SelectItem value="RESOLVED">{t("resolved")}</SelectItem>
                <SelectItem value="CLOSED">{t("closed")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("typeFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                <SelectItem value="DELIVERY_ISSUE">
                  {t("deliveryIssue")}
                </SelectItem>
                <SelectItem value="PAYMENT_DISPUTE">
                  {t("paymentDispute")}
                </SelectItem>
                <SelectItem value="SERVICE_QUALITY">
                  {t("serviceQuality")}
                </SelectItem>
                <SelectItem value="CANCELLATION">
                  {t("cancellation")}
                </SelectItem>
                <SelectItem value="OTHER">{t("other")}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
            >
              {t("clearFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("allDisputes")}
          </TabsTrigger>
          <TabsTrigger value="open" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("openDisputes")}
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("inProgressDisputes")}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {t("resolvedDisputes")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <DisputesList
            statusFilter="all"
            searchTerm={searchTerm}
            typeFilter={typeFilter}
          />
        </TabsContent>

        <TabsContent value="open">
          <DisputesList
            statusFilter="OPEN"
            searchTerm={searchTerm}
            typeFilter={typeFilter}
          />
        </TabsContent>

        <TabsContent value="in-progress">
          <DisputesList
            statusFilter="IN_PROGRESS"
            searchTerm={searchTerm}
            typeFilter={typeFilter}
          />
        </TabsContent>

        <TabsContent value="resolved">
          <DisputesList
            statusFilter="RESOLVED"
            searchTerm={searchTerm}
            typeFilter={typeFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
