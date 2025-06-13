import { BoxUsageHistory } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import {
  Archive,
  Calendar,
  CheckCircle,
  Cog,
  History,
  Package,
  Timer,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BoxHistoryListProps {
  history: BoxUsageHistory[];
  isLoading?: boolean;
}

export function BoxHistoryList({ history, isLoading }: BoxHistoryListProps) {
  const t = useTranslations("storage");

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">{t("history.empty")}</p>
        </CardContent>
      </Card>
    );
  }

  // Correspondance des icônes par type d'action
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "RESERVATION_CREATED":
        return <Calendar className="h-4 w-4" />;
      case "RESERVATION_UPDATED":
        return <Cog className="h-4 w-4" />;
      case "RESERVATION_CANCELLED":
        return <X className="h-4 w-4" />;
      case "BOX_ACCESSED":
        return <Package className="h-4 w-4" />;
      case "BOX_CLOSED":
        return <Archive className="h-4 w-4" />;
      case "PAYMENT_PROCESSED":
        return <CheckCircle className="h-4 w-4" />;
      case "EXTENDED_RENTAL":
        return <Timer className="h-4 w-4" />;
      case "INSPECTION_COMPLETED":
        return <User className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  // Correspondance des couleurs par type d'action
  const getActionBadgeVariant = (
    actionType: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (actionType) {
      case "RESERVATION_CREATED":
        return "default";
      case "RESERVATION_UPDATED":
        return "secondary";
      case "RESERVATION_CANCELLED":
        return "destructive";
      case "PAYMENT_PROCESSED":
        return "default";
      case "EXTENDED_RENTAL":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Traduction du type d'action
  const getActionTypeLabel = (actionType: string) => {
    return t(`history.actionTypes.${actionType.toLowerCase()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
            >
              <div className="mt-1 bg-muted p-2 rounded-full">
                {getActionIcon(item.actionType)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={getActionBadgeVariant(item.actionType)}>
                    {getActionTypeLabel(item.actionType)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.actionTime), "Pp", { locale: fr })}
                  </span>
                </div>
                {item.details && <p className="text-sm">{item.details}</p>}
                {item.deviceInfo && (
                  <p className="text-xs text-muted-foreground">
                    {item.deviceInfo}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
