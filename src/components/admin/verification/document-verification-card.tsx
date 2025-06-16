import { useState } from "react";
import { useTranslations } from "next-intl";
import { Document, User, VerificationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Check, FileText, AlertTriangle, Eye } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface DocumentVerificationCardProps {
  document: Document & { user: Pick<User, "id" | "name" | "email" | "role"> };
  locale: "fr" | "en";
  onVerified?: () => void;
}

export function DocumentVerificationCard({
  document,
  locale,
  onVerified}: DocumentVerificationCardProps) {
  const t = useTranslations();
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const dateLocale = locale === "fr" ? fr : enUS;

  const approveDocument = api.verification.approveDocument.useMutation({
    onSuccess: () => {
      toast.success(t("notifications.document_approved"));
      if (onVerified) onVerified();
      setIsApproveDialogOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    }});

  const rejectDocument = api.verification.rejectDocument.useMutation({
    onSuccess: () => {
      toast.success(t("notifications.document_rejected"));
      if (onVerified) onVerified();
      setIsRejectDialogOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    }});

  const handleApprove = () => {
    approveDocument.mutate({ documentId: document.id,
      notes: approveNotes || undefined });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error(t("errors.reason_required"));
      return;
    }

    rejectDocument.mutate({ documentId: document.id,
      reason: rejectReason });
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: dateLocale});
  };

  const getDocumentTypeName = (type: string) => {
    return t(`documents.types.${type.toLowerCase()}`);
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PENDING:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            {t("status.pending")}
          </Badge>
        );
      case VerificationStatus.APPROVED:
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            {t("status.approved")}
          </Badge>
        );
      case VerificationStatus.REJECTED:
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            {t("status.rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Function to determine if we can show a preview (image or PDF)
  const canShowPreview = () => {
    const mimeType = document.mimeType.toLowerCase();
    return mimeType.startsWith("image/") || mimeType === "application/pdf";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {getDocumentTypeName(document.type)}
            </CardTitle>
            <CardDescription>
              {t("uploaded_by")}: {document.user.name} ({ document.user.email })
            </CardDescription>
            <div className="text-sm text-muted-foreground mt-1">
              {t("uploaded")}: {formatDate(document.uploadedAt)}
            </div>
          </div>
          {getStatusBadge(document.verificationStatus)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {document.fileName}
            </span>
          </div>

          {document.verificationStatus === VerificationStatus.REJECTED &&
            document.rejectionReason && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex gap-2 items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-700">
                      {t("rejection_reason")}:
                    </div>
                    <div className="text-sm text-red-600">
                      {document.rejectionReason}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {document.verificationStatus === VerificationStatus.APPROVED &&
            document.notes && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex gap-2 items-start">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-green-700">
                      {t("approval_notes")}:
                    </div>
                    <div className="text-sm text-green-600">
                      {document.notes}
                    </div>
                  </div>
                </div>
              </div>
            )}

          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setIsViewerOpen(true)}
            >
              <Eye className="h-4 w-4" />
              {t("view_document")}
            </Button>
          </div>
        </div>
      </CardContent>

      {document.verificationStatus === VerificationStatus.PENDING && (
        <CardFooter className="flex justify-between gap-2 pt-2">
          <Button
            variant="outline"
            className="w-full gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => setIsRejectDialogOpen(true)}
          >
            <X className="h-4 w-4" />
            {t("reject")}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-1 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
            onClick={() => setIsApproveDialogOpen(true)}
          >
            <Check className="h-4 w-4" />
            {t("approve")}
          </Button>
        </CardFooter>
      )}

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reject_document")}</DialogTitle>
            <DialogDescription>
              {t("reject_document_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              placeholder={t("enter_rejection_reason")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectDocument.isLoading}
            >
              {rejectDocument.isLoading ? t("rejecting") : t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("approve_document")}</DialogTitle>
            <DialogDescription>
              {t("approve_document_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              placeholder={t("enter_approval_notes")}
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {t("notes_optional")}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={approveDocument.isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveDocument.isLoading ? t("approving") : t("approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{document.fileName}</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {canShowPreview() ? (
              document.mimeType.startsWith("image/") ? (
                <div className="relative h-[500px] w-full">
                  <Image
                    src={document.fileUrl}
                    alt={document.fileName}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={`${document.fileUrl}#toolbar=0`}
                  className="w-full h-[500px]"
                  title={document.fileName}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t("preview_not_available")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.open(document.fileUrl, "blank")}
                >
                  {t("download_document")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
