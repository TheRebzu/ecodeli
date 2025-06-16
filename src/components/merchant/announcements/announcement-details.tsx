"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatCurrency } from "@/utils/document-utils";
import {
  Package,
  ShoppingBag,
  MapPin,
  Calendar,
  Clock,
  Truck,
  CircleDollarSign,
  Info,
  Tag,
  User} from "lucide-react";

interface AnnouncementDetailsProps {
  announcement: any; // Replace with proper type
}

export function AnnouncementDetails({
  announcement}: AnnouncementDetailsProps) {
  const t = useTranslations("announcements");

  if (!announcement) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t("noAnnouncementFound")}
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("details.title")}</CardTitle>
          <Badge
            variant={announcement.status === "ACTIVE" ? "success" : "secondary"}
          >
            {t(`status.${announcement.status.toLowerCase()}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.itemType")}
                </div>
                <div className="text-muted-foreground">
                  {announcement.itemType}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShoppingBag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">{t("details.weight")}</div>
                <div className="text-muted-foreground">
                  {announcement.weight} kg
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.pickupLocation")}
                </div>
                <div className="text-muted-foreground">
                  {announcement.pickup?.formattedAddress || t("notSpecified")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.deliveryLocation")}
                </div>
                <div className="text-muted-foreground">
                  {announcement.delivery?.formattedAddress || t("notSpecified")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.pickupDate")}
                </div>
                <div className="text-muted-foreground">
                  {announcement.pickupDate
                    ? formatDate(announcement.pickupDate)
                    : t("flexible")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.pickupWindow")}
                </div>
                <div className="text-muted-foreground">
                  {announcement.pickupTimeWindow || t("flexible")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.deliveryDate")}
                </div>
                <div className="text-muted-foreground">
                  {announcement.deliveryDate
                    ? formatDate(announcement.deliveryDate)
                    : t("flexible")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.deliveryWindow")}
                </div>
                <div className="text-muted-foreground">
                  {announcement.deliveryTimeWindow || t("flexible")}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CircleDollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">{t("details.price")}</div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(announcement.price)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">
                  {t("details.deliveryType")}
                </div>
                <div className="text-muted-foreground">
                  {t(`deliveryType.${announcement.deliveryType.toLowerCase()}`)}
                </div>
              </div>
            </div>
          </div>

          {announcement.description && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">
                    {t("details.description")}
                  </div>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {announcement.description}
                  </div>
                </div>
              </div>
            </>
          )}

          {announcement.tags && announcement.tags.length > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{t("details.tags")}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {announcement.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium">
                {t("details.createdAt")}
              </div>
              <div className="text-muted-foreground">
                {formatDate(announcement.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AnnouncementDetails;
