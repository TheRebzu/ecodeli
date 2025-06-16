import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { JsonView } from "@/components/admin/deliverers/document-review";

// Type pour les logs d'audit
interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  changes: Record<string, unknown> | null;
  createdAt: Date;
  performedBy: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface AuditLogDetailsProps {
  log: AuditLog;
  onClose: () => void;
}

export function AuditLogDetails({ log, onClose }: AuditLogDetailsProps) {
  const t = useTranslations("admin.audit");

  // Formater l'action du log
  const formatAction = (action: string): { label: string; variant: string } => {
    switch (action) {
      case "CREATE":
        return { label: t("actions.create"), variant: "default" };
      case "UPDATE":
        return { label: t("actions.update"), variant: "default" };
      case "DELETE":
        return { label: t("actions.delete"), variant: "destructive" };
      case "STATUS_CHANGED":
        return { label: t("actions.statusChanged"), variant: "default" };
      case "APPLICATION_ADDED":
        return { label: t("actions.applicationAdded"), variant: "default" };
      case "APPLICATION_STATUS_UPDATED":
        return {
          label: t("actions.applicationStatusUpdated"),
          variant: "default"};
      default:
        return { label: action, variant: "default" };
    }
  };

  // Formater le type d'entité
  const formatEntityType = (type: string) => {
    switch (type) {
      case "announcement":
        return t("entityTypes.announcement");
      case "user":
        return t("entityTypes.user");
      case "delivery":
        return t("entityTypes.delivery");
      default:
        return type;
    }
  };

  const { label, variant } = formatAction(log.action);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("detailsTitle")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <div className="font-semibold">{t("columns.action")}</div>
            <Badge variant={variant as any}>{label}</Badge>
          </div>

          <div className="space-y-2">
            <div className="font-semibold">{t("columns.date")}</div>
            <div>{format(new Date(log.createdAt), "PPp", { locale })}</div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold">{t("columns.entityType")}</div>
            <div>{formatEntityType(log.entityType)}</div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold">{t("columns.entityId")}</div>
            <div className="font-mono text-sm">{log.entityId}</div>
          </div>

          <div className="space-y-2 col-span-2">
            <div className="font-semibold">{t("columns.performedBy")}</div>
            <div className="flex items-center gap-2">
              {log.performedBy.image && (
                <img
                  src={log.performedBy.image}
                  alt={log.performedBy.name}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div>
                <div>{log.performedBy.name}</div>
                <div className="text-sm text-muted-foreground">
                  {log.performedBy.email}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 col-span-2">
            <div className="font-semibold">{t("columns.changes")}</div>
            {log.changes ? (
              <div className="border rounded-md p-4 bg-muted/50 overflow-auto max-h-96">
                <JsonView data={log.changes} />
              </div>
            ) : (
              <div className="text-muted-foreground">{t("noChanges")}</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button>{t("close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
