"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ReservationWithBoxAndWarehouse } from "@/types/warehouses/storage-box";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  QrCode,
  MapPin,
  Copy,
  Phone,
  Shield,
  Building2} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export type AccessBoxDialogProps = {
  reservation: ReservationWithBoxAndWarehouse;
  open: boolean;
  onClose: () => void;
};

export function AccessBoxDialog({
  reservation,
  open,
  onClose}: AccessBoxDialogProps) {
  const t = useTranslations("storage");
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetAccessCode = () => {
    setIsLoading(true);

    // Simuler une requête API avec un délai
    // Appel API réel via tRPC
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("access.codeCopied"));
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("access.title")}</DialogTitle>
          <DialogDescription>{t("access.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("access.boxName")}</span>
              <span className="text-sm">{reservation.box.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("access.warehouse")}
              </span>
              <span className="text-sm">{reservation.box.warehouse.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("access.boxType")}</span>
              <Badge variant="outline" className="text-xs">
                {t(`boxTypes.${reservation.box.boxType.toLowerCase()}`)}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("access.warehouseAddress")}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {reservation.box.warehouse.address}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    window.open(
                      `https://maps.google.com/?q=${reservation.box.warehouse.address}`,
                      "blank",
                    )
                  }
                >
                  <MapPin className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("access.warehousePhone")}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {reservation.box.warehouse.contactPhone ||
                    t("access.phoneNotAvailable")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    window.open(
                      `tel:${reservation.box.warehouse.contactPhone}`,
                      "blank",
                    )
                  }
                  disabled={!reservation.box.warehouse.contactPhone}
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {accessCode ? (
            <div className="space-y-3">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>{t("access.codeTitle")}</AlertTitle>
                <AlertDescription>
                  {t("access.codeDescription")}
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-center p-4 border rounded-md bg-muted">
                <div className="text-3xl font-mono tracking-widest select-all">
                  {accessCode}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={() => copyToClipboard(accessCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3 p-3 text-sm rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <QrCode className="h-5 w-5 flex-shrink-0" />
                <p>{t("access.showCode")}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-6 border rounded-md">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-center text-sm">
                {t("access.getCodeDescription")}
              </p>
              <Button
                className="w-full"
                onClick={handleGetAccessCode}
                disabled={isLoading}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {isLoading ? t("access.gettingCode") : t("access.getCode")}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("access.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
