"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { formatDate, formatCurrency } from "@/utils/document-utils";
import {
  Info,
  Star,
  Check,
  X,
  User,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface DeliveryRequest {
  id: string;
  delivererId: string;
  status: string;
  createdAt: string;
  proposedPrice?: number;
  message?: string;
  deliverer?: {
    id: string;
    userId: string;
    name: string;
    image?: string;
    rating?: number;
    yearsOfExperience?: number;
    totalDeliveries?: number;
  };
}

interface DeliveryRequestsProps {
  announcementId: string;
  requests: DeliveryRequest[];
  isLoading?: boolean;
}

export function DeliveryRequests({
  announcementId,
  requests = [],
  isLoading = false,
}: DeliveryRequestsProps) {
  const t = useTranslations("announcements");
  const [selectedRequest, setSelectedRequest] =
    useState<DeliveryRequest | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // Mutation pour accepter une candidature
  const assignDelivererMutation = api.announcement.assignDeliverer.useMutation({
    onSuccess: () => {
      toast.success(t("requestAccepted"));
      setOpenDialog(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation pour refuser une candidature
  const rejectApplicationMutation =
    api.announcement.updateApplicationStatus.useMutation({
      onSuccess: () => {
        toast.success(t("requestRejected"));
        setOpenDialog(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleAccept = async (applicationId: string) => {
    try {
      await assignDelivererMutation.mutateAsync({
        announcementId,
        applicationId,
      });
    } catch (err) {
      // Error is handled in onError
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      await rejectApplicationMutation.mutateAsync({
        applicationId,
        status: "REJECTED",
      });
    } catch (err) {
      // Error is handled in onError
    }
  };

  const handleViewDetails = (request: DeliveryRequest) => {
    setSelectedRequest(request);
    setOpenDialog(true);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-muted rounded-md"></div>
        <div className="h-20 bg-muted rounded-md"></div>
        <div className="h-20 bg-muted rounded-md"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{t("noRequests")}</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {t("noRequestsDescription")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={request.deliverer?.image || undefined}
                        alt={request.deliverer?.name || ""}
                      />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {request.deliverer?.name || t("unknownDeliverer")}
                      </div>
                      {request.deliverer?.rating !== undefined && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="h-3.5 w-3.5 mr-1 fill-yellow-400 text-yellow-400" />
                          {request.deliverer.rating.toFixed(1)}
                          {request.deliverer.totalDeliveries && (
                            <span className="ml-2">
                              ({request.deliverer.totalDeliveries} livraisons)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        request.status === "PENDING"
                          ? "outline"
                          : request.status === "ACCEPTED"
                            ? "success"
                            : "destructive"
                      }
                    >
                      {t(`status.${request.status.toLowerCase()}`)}
                    </Badge>
                    <div className="font-semibold">
                      {request.proposedPrice !== undefined
                        ? formatCurrency(request.proposedPrice)
                        : ""}
                    </div>
                  </div>
                </div>

                {request.message && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {request.message.length > 100
                      ? request.message.substring(0, 100) + "..."
                      : request.message}
                  </div>
                )}

                <div className="mt-4 flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {formatDate(request.createdAt)}
                </div>
              </div>

              {request.status === "PENDING" && (
                <CardFooter className="border-t bg-muted/50 px-6 py-4">
                  <div className="flex justify-end gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("decline")}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAccept(request.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t("accept")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {t("details")}
                    </Button>
                  </div>
                </CardFooter>
              )}

              {request.status !== "PENDING" && (
                <CardFooter className="border-t bg-muted/50 px-6 py-4">
                  <div className="flex justify-end w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {t("details")}
                    </Button>
                  </div>
                </CardFooter>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("delivererDetails")}</DialogTitle>
            <DialogDescription>
              {t("delivererDetailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && selectedRequest.deliverer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage
                    src={selectedRequest.deliverer.image || ""}
                    alt={selectedRequest.deliverer.name}
                  />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-lg">
                    {selectedRequest.deliverer.name}
                  </h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 mr-1 fill-yellow-400 text-yellow-400" />
                    {selectedRequest.deliverer.rating?.toFixed(1) || "N/A"}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {selectedRequest.deliverer.yearsOfExperience !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("experience")}
                    </span>
                    <span className="font-medium">
                      {selectedRequest.deliverer.yearsOfExperience} {t("years")}
                    </span>
                  </div>
                )}
                {selectedRequest.deliverer.totalDeliveries !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("totalDeliveries")}
                    </span>
                    <span className="font-medium">
                      {selectedRequest.deliverer.totalDeliveries}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">{t("message")}</h4>
                <div className="text-sm rounded-md bg-muted p-4">
                  {selectedRequest.message || t("noMessage")}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">{t("pricing")}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {t("proposedPrice")}
                  </span>
                  <span className="text-lg font-semibold">
                    {selectedRequest.proposedPrice !== undefined
                      ? formatCurrency(selectedRequest.proposedPrice)
                      : t("noPriceProvided")}
                  </span>
                </div>
              </div>

              {selectedRequest.status === "PENDING" && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedRequest.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("decline")}
                  </Button>
                  <Button onClick={() => handleAccept(selectedRequest.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    {t("accept")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
