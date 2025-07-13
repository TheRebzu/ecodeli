"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Star,
  Camera,
  MapPin,
  Clock,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeliveryValidationProps {
  delivery: {
    id: string;
    status: string;
    announcement: {
      title: string;
      pickupAddress: string;
      deliveryAddress: string;
    };
    deliverer: {
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
    ProofOfDelivery?: {
      photoUrl: string;
      notes: string;
      uploadedAt: string;
    };
  };
  onValidationComplete: () => void;
}

export default function DeliveryValidation({
  delivery,
  onValidationComplete,
}: DeliveryValidationProps) {
  const t = useTranslations("client.delivery");
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [validated, setValidated] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [review, setReview] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleValidation = async (isValidated: boolean) => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/client/deliveries/${delivery.id}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            validated: isValidated,
            rating: isValidated ? rating : undefined,
            review: isValidated ? review : undefined,
            issues: !isValidated
              ? [
                  {
                    type: "OTHER",
                    description: rejectionReason,
                  },
                ]
              : undefined,
          }),
        },
      );

      if (response.ok) {
        toast.success(
          isValidated
            ? t("validation.success.accepted")
            : t("validation.success.rejected"),
        );
        setValidated(isValidated);
        setShowValidationDialog(false);
        setShowRejectionDialog(false);
        onValidationComplete();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("validation.error.failed"));
      }
    } catch (error) {
      console.error("Error validating delivery:", error);
      toast.error(t("validation.error.failed"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "bg-gray-100 text-gray-800", label: "En attente" },
      ACCEPTED: { color: "bg-blue-100 text-blue-800", label: "Acceptée" },
      IN_PROGRESS: {
        color: "bg-yellow-100 text-yellow-800",
        label: "En cours de livraison",
      },
      DELIVERED: { color: "bg-green-100 text-green-800", label: "Livrée" },
      CANCELLED: { color: "bg-red-100 text-red-800", label: "Annulée" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const canValidate =
    delivery.status === "IN_TRANSIT" && delivery.ProofOfDelivery;

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              {delivery.announcement.title}
            </span>
            {getStatusBadge(delivery.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations de livraison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{t("pickup")}:</span>
                <span>{delivery.announcement.pickupAddress}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{t("delivery")}:</span>
                <span>{delivery.announcement.deliveryAddress}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{t("deliverer")}:</span>
                <span>
                  {delivery.deliverer.user.profile
                    ? `${delivery.deliverer.user.profile.firstName || "Non renseigné"} ${delivery.deliverer.user.profile.lastName || "Non renseigné"}`
                    : "Profil non disponible"}
                </span>
              </div>
            </div>
          </div>

          {/* Preuve de livraison */}
          {delivery.ProofOfDelivery && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-3 flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                {t("proof.title")}
              </h4>

              {delivery.ProofOfDelivery.photoUrl && (
                <div className="mb-3">
                  <img
                    src={delivery.ProofOfDelivery.photoUrl}
                    alt="Preuve de livraison"
                    className="w-full max-w-md rounded-lg border"
                  />
                </div>
              )}

              {delivery.ProofOfDelivery.notes && (
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{t("proof.notes")}:</strong>{" "}
                  {delivery.ProofOfDelivery.notes}
                </p>
              )}

              <p className="text-xs text-gray-500">
                {t("proof.uploaded_at")}:{" "}
                {new Date(delivery.ProofOfDelivery.uploadedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Actions de validation */}
          {canValidate && (
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={() => setShowValidationDialog(true)}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {t("validation.accept")}
              </Button>

              <Button
                onClick={() => setShowRejectionDialog(true)}
                variant="destructive"
                disabled={loading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t("validation.reject")}
              </Button>
            </div>
          )}

          {/* Statut de validation */}
          {validated !== null && (
            <div
              className={`p-3 rounded-lg ${validated ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
            >
              <div className="flex items-center">
                {validated ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                )}
                <span className={validated ? "text-green-800" : "text-red-800"}>
                  {validated
                    ? t("validation.status.accepted")
                    : t("validation.status.rejected")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de validation positive */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("validation.dialog.accept_title")}</DialogTitle>
            <DialogDescription>
              {t("validation.dialog.accept_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("validation.rating")}
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* Avis */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("validation.review")} ({t("validation.optional")})
              </label>
              <Textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder={t("validation.review_placeholder")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowValidationDialog(false)}
            >
              {t("validation.cancel")}
            </Button>
            <Button
              onClick={() => handleValidation(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading
                ? t("validation.loading")
                : t("validation.confirm_accept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de rejet */}
      <AlertDialog
        open={showRejectionDialog}
        onOpenChange={setShowRejectionDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("validation.dialog.reject_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("validation.dialog.reject_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t("validation.rejection_reason_placeholder")}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("validation.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleValidation(false)}
              disabled={!rejectionReason.trim() || loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading
                ? t("validation.loading")
                : t("validation.confirm_reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
