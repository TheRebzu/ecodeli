"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Package,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface DeliveryCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  onCancelComplete: () => void;
}

export default function DeliveryCancelDialog({
  open,
  onOpenChange,
  deliveryId,
  onCancelComplete,
}: DeliveryCancelDialogProps) {
  const t = useTranslations("deliverer.deliveries");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error(t("cancel.dialog.error.no_reason"));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: cancelReason.trim(),
            cancelledAt: new Date().toISOString(),
          }),
        },
      );

      if (response.ok) {
        toast.success(t("cancel.dialog.success"));
        setCancelReason("");
        onOpenChange(false);
        onCancelComplete();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("cancel.dialog.error.general"));
      }
    } catch (error) {
      console.error("Error cancelling delivery:", error);
      toast.error(t("cancel.dialog.error.general"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCancelReason("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            {t("cancel.dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("cancel.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {t("cancel.dialog.important_title")}
              </span>
            </div>
            <p className="text-sm text-red-700">
              {t("cancel.dialog.important_message")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("cancel.dialog.reason_label")}
            </label>
            <Textarea
              placeholder={t("cancel.dialog.reason_placeholder")}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("cancel.dialog.min_chars")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t("cancel.dialog.back")}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={
              !cancelReason.trim() || cancelReason.length < 10 || loading
            }
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("cancel.dialog.cancelling")}
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                {t("cancel.dialog.cancel_button")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
