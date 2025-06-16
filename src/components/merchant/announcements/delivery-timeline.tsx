"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot} from "@/components/ui/timeline";
import { formatDate, formatTime } from "@/utils/document-utils";

interface DeliveryTimelineProps {
  deliveryId: string;
  events?: any[]; // Replace with proper type
  isLoading?: boolean;
}

export function DeliveryTimeline({
  deliveryId,
  events = [],
  isLoading = false}: DeliveryTimelineProps) {
  const t = useTranslations("deliveries");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("timeline.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-20 bg-muted rounded-md mb-4"></div>
            <div className="h-20 bg-muted rounded-md mb-4"></div>
            <div className="h-20 bg-muted rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("timeline.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            {t("timeline.noEvents")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("timeline.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Timeline>
          {events.map((event, index) => (
            <TimelineItem key={event.id || index}>
              <TimelineSeparator>
                <TimelineDot status={getStatusColor(event.type)} />
                {index < events.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <div className="ml-4">
                  <h4 className="font-medium">
                    {getEventTitle(event.type, t)}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {event.description || getDefaultDescription(event.type, t)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(event.timestamp)} à{" "}
                    {formatTime(event.timestamp)}
                  </p>
                </div>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getStatusColor(
  eventType: string,
): "default" | "success" | "warning" | "error" | "info" {
  switch (eventType) {
    case "CREATED":
    case "ASSIGNED":
      return "info";
    case "PICKUP_STARTED":
    case "PICKUP_COMPLETED":
    case "DELIVERY_STARTED":
      return "warning";
    case "DELIVERED":
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "FAILED":
      return "error";
    default:
      return "default";
  }
}

function getEventTitle(eventType: string, t: any): string {
  return t(`timeline.events.${eventType.toLowerCase()}.title`);
}

function getDefaultDescription(eventType: string, t: any): string {
  return t(`timeline.events.${eventType.toLowerCase()}.description`);
}

export default DeliveryTimeline;
