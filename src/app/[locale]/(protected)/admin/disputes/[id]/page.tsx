"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  Package,
  Truck,
} from "lucide-react";
import { DisputeDetails } from "@/features/admin/components/disputes/dispute-details";
import { DisputeTimeline } from "@/features/admin/components/disputes/dispute-timeline";
import { DisputeResolutionForm } from "@/features/admin/components/disputes/dispute-resolution-form";

export default function DisputeDetailsPage() {
  const t = useTranslations("admin.disputes");
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    // TODO: Fetch dispute details
    setLoading(false);
  }, [disputeId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!dispute) {
    return <div>Dispute not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("dispute")} #{disputeId}
            </h1>
            <p className="text-muted-foreground">{t("disputeDetails")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              dispute.status === "OPEN"
                ? "destructive"
                : dispute.status === "IN_PROGRESS"
                  ? "secondary"
                  : dispute.status === "RESOLVED"
                    ? "default"
                    : "outline"
            }
          >
            {t(dispute.status.toLowerCase())}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Details */}
          <DisputeDetails dispute={dispute} />

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t("timeline")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DisputeTimeline disputeId={disputeId} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t("quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("status")}</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">{t("open")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">
                      {t("inProgress")}
                    </SelectItem>
                    <SelectItem value="RESOLVED">{t("resolved")}</SelectItem>
                    <SelectItem value="CLOSED">{t("closed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  // TODO: Update status
                }}
              >
                {t("updateStatus")}
              </Button>
            </CardContent>
          </Card>

          {/* Resolution Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t("resolution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DisputeResolutionForm
                disputeId={disputeId}
                onResolved={() => {
                  // TODO: Handle resolution
                }}
              />
            </CardContent>
          </Card>

          {/* Related Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("relatedInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("client")}: {dispute.clientName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("deliverer")}: {dispute.delivererName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("delivery")}: #{dispute.deliveryId}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("amount")}: €{dispute.amount}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("created")}:{" "}
                  {new Date(dispute.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
