"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger} from "@/components/ui/dialog";
import {
  QrCode,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  MessageCircle,
  Phone} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { toast } from "sonner";
import QRCode from "qrcode";

interface DeliveryCodeDisplayProps {
  deliveryId: string;
  code: string;
  qrCodeData?: string;
  expiresAt?: Date;
  isValid?: boolean;
  delivererInfo?: {
    id: string;
    name: string;
    phone?: string;
    image?: string;
    rating: number;
    estimatedArrival?: Date;
  };
  onRefreshCode?: () => void;
  onContactDeliverer?: () => void;
  className?: string;
}

export const DeliveryCodeDisplay: React.FC<DeliveryCodeDisplayProps> = ({ deliveryId,
  code,
  qrCodeData,
  expiresAt,
  isValid = true,
  delivererInfo,
  onRefreshCode,
  onContactDeliverer,
  className }) => {
  const t = useTranslations("delivery");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [codeVisible, setCodeVisible] = useState(false);
  const [timeToExpiry, setTimeToExpiry] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  // Générer le QR code
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataToEncode =
          qrCodeData ||
          JSON.stringify({ deliveryId,
            code,
            timestamp: new Date().toISOString() });

        const url = await QRCode.toDataURL(dataToEncode, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF"}});

        setQrCodeUrl(url);
      } catch (error) {
        console.error("Erreur lors de la génération du QR code:", error);
      }
    };

    generateQRCode();
  }, [deliveryId, code, qrCodeData]);

  // Calculer le temps restant avant expiration
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimeToExpiry = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeToExpiry("");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeToExpiry(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeToExpiry(`${minutes}m ${seconds}s`);
      } else {
        setTimeToExpiry(`${seconds}s`);
      }

      setIsExpired(false);
    };

    updateTimeToExpiry();
    const interval = setInterval(updateTimeToExpiry, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("codeCopied"));
    } catch (error) {
      // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(t("codeCopied"));
      } catch (fallbackError) {
        toast.error(t("copyError"));
      }
      document.body.removeChild(textArea);
    }
  };

  const formatCode = (code: string) => {
    // Formater le code en groupes de 3 caractères
    return code.replace(/(.{3})/g, "$1 ").trim();
  };

  const getCodeStatus = () => {
    if (isExpired) return "expired";
    if (!isValid) return "invalid";
    return "valid";
  };

  const getStatusColor = () => {
    const status = getCodeStatus();
    switch (status) {
      case "valid":
        return "text-green-600 bg-green-50 border-green-200";
      case "expired":
        return "text-red-600 bg-red-50 border-red-200";
      case "invalid":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatEstimatedArrival = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return t("arrived");

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return t("arrivesInHours", { hours, minutes });
    } else {
      return t("arrivesInMinutes", { minutes });
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Code de validation principal */}
      <Card className={cn("border-2", getStatusColor())}>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-xl">{t("validationCode")}</CardTitle>
          </div>
          <CardDescription>{t("shareCodeWithDeliverer")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Statut */}
          <div className="text-center">
            <Badge
              variant="outline"
              className={cn("text-lg px-4 py-2", getStatusColor())}
            >
              {isExpired && <AlertCircle className="h-4 w-4 mr-2" />}
              {!isExpired && isValid && (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {!isExpired && !isValid && (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              {t(`codeStatus.${getCodeStatus()}`)}
            </Badge>
          </div>

          {/* Code avec contrôle de visibilité */}
          <div className="text-center space-y-4">
            <div className="relative">
              <div
                className={cn(
                  "text-4xl font-mono font-bold tracking-widest p-6 rounded-lg border-2 border-dashed",
                  codeVisible
                    ? "bg-blue-50 border-blue-300"
                    : "bg-gray-50 border-gray-300",
                )}
              >
                {codeVisible ? formatCode(code) : "••• •••"}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setCodeVisible(!codeVisible)}
              >
                {codeVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(code)}
                disabled={!isValid || isExpired}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("copyCode")}
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!qrCodeUrl || !isValid || isExpired}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {t("showQRCode")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("qrCodeTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("qrCodeDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center p-6">
                    {qrCodeUrl && (
                      <img
                        src={qrCodeUrl}
                        alt={t("qrCodeAlt")}
                        className="w-64 h-64 border rounded-lg"
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {onRefreshCode && (isExpired || !isValid) && (
                <Button variant="outline" onClick={onRefreshCode}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("refreshCode")}
                </Button>
              )}
            </div>
          </div>

          {/* Informations d'expiration */}
          {expiresAt && !isExpired && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>{t("expiresIn")}</AlertTitle>
              <AlertDescription>
                {timeToExpiry
                  ? t("codeExpiresIn", { time })
                  : t("codeExpired")}
              </AlertDescription>
            </Alert>
          )}

          {/* Code expiré */}
          {isExpired && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("codeExpired")}</AlertTitle>
              <AlertDescription>{t("codeExpiredDescription")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Informations sur le livreur */}
      {delivererInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>{t("delivererInfo")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {delivererInfo.image && (
                  <img
                    src={delivererInfo.image}
                    alt={delivererInfo.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{delivererInfo.name}</div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      ⭐ {delivererInfo.rating.toFixed(1)}
                    </span>
                    {delivererInfo.phone && (
                      <span>• {delivererInfo.phone}</span>
                    )}
                  </div>
                </div>
              </div>

              {delivererInfo.estimatedArrival && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>{t("estimatedArrival")}</AlertTitle>
                  <AlertDescription>
                    {formatEstimatedArrival(delivererInfo.estimatedArrival)}
                  </AlertDescription>
                </Alert>
              )}

              {onContactDeliverer && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onContactDeliverer}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t("messageDeliverer")}
                  </Button>

                  {delivererInfo.phone && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`tel:${delivererInfo.phone}`)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {t("callDeliverer")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-900">{t("instructions")}</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {t("instruction1")}</li>
              <li>• {t("instruction2")}</li>
              <li>• {t("instruction3")}</li>
              <li>• {t("instruction4")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryCodeDisplay;
