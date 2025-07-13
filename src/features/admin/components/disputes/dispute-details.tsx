"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Package,
  DollarSign,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface DisputeDetailsProps {
  dispute: any;
}

export function DisputeDetails({ dispute }: DisputeDetailsProps) {
  const t = useTranslations("admin.disputes");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="destructive">{t("open")}</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary">{t("inProgress")}</Badge>;
      case "RESOLVED":
        return <Badge variant="default">{t("resolved")}</Badge>;
      case "CLOSED":
        return <Badge variant="outline">{t("closed")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DELIVERY_ISSUE":
        return <Package className="h-5 w-5" />;
      case "PAYMENT_DISPUTE":
        return <AlertTriangle className="h-5 w-5" />;
      case "SERVICE_QUALITY":
        return <MessageSquare className="h-5 w-5" />;
      case "CANCELLATION":
        return <XCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTypeIcon(dispute.type)}
          {dispute.title}
          {getStatusBadge(dispute.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <div>
          <h4 className="font-medium mb-2">{t("description")}</h4>
          <p className="text-muted-foreground">{dispute.description}</p>
        </div>

        <Separator />

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{t("client")}:</strong> {dispute.clientName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{t("delivery")}:</strong> #{dispute.deliveryId}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{t("amount")}:</strong> €{dispute.amount}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{t("created")}:</strong>{" "}
                {new Date(dispute.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{t("updated")}:</strong>{" "}
                {new Date(dispute.updatedAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{t("type")}:</strong> {t(dispute.type.toLowerCase())}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Additional Information */}
        {dispute.additionalInfo && (
          <div>
            <h4 className="font-medium mb-2">{t("additionalInfo")}</h4>
            <p className="text-muted-foreground text-sm">
              {dispute.additionalInfo}
            </p>
          </div>
        )}

        {/* Attachments */}
        {dispute.attachments && dispute.attachments.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">{t("attachments")}</h4>
            <div className="flex gap-2">
              {dispute.attachments.map((attachment: any, index: number) => (
                <Badge key={index} variant="outline" className="cursor-pointer">
                  {attachment.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
