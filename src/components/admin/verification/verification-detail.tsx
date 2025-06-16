"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  FileText,
  Calendar,
  User,
  Shield,
  Download,
  ExternalLink} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface VerificationDetailProps {
  verificationId: string;
}

export function VerificationDetail({
  verificationId}: VerificationDetailProps) {
  const t = useTranslations("admin.verification");
  const router = useRouter();
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const {
    data: verification,
    isLoading,
    error} = api.admin.getVerificationDetail.useQuery({ verificationId });

  const approveVerification = api.admin.approveVerification.useMutation({ onSuccess: () => {
      toast({
        title: t("detail.approval.success.title"),
        description: t("detail.approval.success.description"),
        variant: "default" });
      setIsApproveDialogOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast({ title: t("detail.approval.error.title"),
        description: error.message,
        variant: "destructive" });
    }});

  const rejectVerification = api.admin.rejectVerification.useMutation({ onSuccess: () => {
      toast({
        title: t("detail.rejection.success.title"),
        description: t("detail.rejection.success.description"),
        variant: "default" });
      setIsRejectDialogOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast({ title: t("detail.rejection.error.title"),
        description: error.message,
        variant: "destructive" });
    }});

  const handleApprove = () => {
    approveVerification.mutate({ verificationId,
      notes: approvalNotes });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({ title: t("detail.rejection.validation.title"),
        description: t("detail.rejection.validation.description"),
        variant: "destructive" });
      return;
    }

    rejectVerification.mutate({ verificationId,
      reason: rejectionReason });
  };

  const goBack = () => {
    router.back();
  };

  if (isLoading) {
    return <VerificationDetailSkeleton />;
  }

  if (error || !verification) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{t("detail.error.title")}</CardTitle>
          </div>
          <CardDescription>{t("detail.error.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-center">
              {error?.message || t("detail.error.notFound")}
            </p>
            <Button className="mt-4" onClick={goBack}>
              {t("detail.actions.back")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPending = verification.status === "PENDING";
  const documentUrl = verification.document.url;
  const documentType = verification.document.type;
  const isImage = /(jpg|jpeg|png|gif|webp)$/i.test(documentType);
  const isPdf = /pdf$/i.test(documentType);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t("detail.title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Document Preview */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.document.title")}</CardTitle>
              <CardDescription>
                {t(`documentTypes.${verification.document.type}`)} -{" "}
                {verification.document.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border rounded-md p-4 min-h-[400px] bg-muted/20 relative">
                {isImage ? (
                  <div className="relative w-full h-[400px]">
                    <Image
                      src={documentUrl}
                      alt={verification.document.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={documentUrl}
                    className="w-full h-[500px]"
                    title={verification.document.name}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium mb-1">
                      {verification.document.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("detail.document.preview.unsupported")}
                    </p>
                    <Button asChild>
                      <a
                        href={documentUrl}
                        target="blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t("detail.document.preview.open")}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 px-6 py-3">
              <div className="text-sm text-muted-foreground">
                {t("detail.document.uploadedAt", {
                  date: format(
                    new Date(verification.document.uploadedAt),
                    "PPP",
                    { locale },
                  )})}
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href={documentUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  {t("detail.document.download")}
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Document History */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.history.title")}</CardTitle>
              <CardDescription>
                {t("detail.history.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-4 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">
                      {t("detail.history.submitted.title")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("detail.history.submitted.description", {
                        date: format(
                          new Date(verification.requestedAt),
                          "PPP p",
                          { locale },
                        ),
                        user:
                          verification.submitter.name ||
                          verification.submitter.email})}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                {verification.status !== "PENDING" && (
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          verification.status === "APPROVED"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {verification.status === "APPROVED" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        {t(
                          `detail.history.${verification.status.toLowerCase()}.title`,
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          `detail.history.${verification.status.toLowerCase()}.description`,
                          {
                            date: format(
                              new Date(verification.verifiedAt || new Date()),
                              "PPP p",
                              { locale },
                            ),
                            user:
                              verification.verifier?.name || "Administrator"},
                        )}
                      </p>
                      {(verification.notes || verification.rejectionReason) && (
                        <div className="mt-2 rounded bg-muted p-3 text-sm">
                          {verification.status === "APPROVED"
                            ? verification.notes
                            : verification.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.user.title")}</CardTitle>
              <CardDescription>{t("detail.user.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{verification.submitter.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {verification.submitter.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.user.role")}
                  </span>
                  <Badge>
                    {t(
                      `roles.${verification.submitter.role?.toLowerCase() || "user"}`,
                    )}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.user.accountCreated")}
                  </span>
                  <span className="text-sm">
                    {format(new Date(verification.submitter.createdAt), "PPP", { locale })}
                  </span>
                </div>
                {verification.submitter.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("detail.user.phone")}
                    </span>
                    <span className="text-sm">
                      {verification.submitter.phoneNumber}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.documentInfo.title")}</CardTitle>
              <CardDescription>
                {t("detail.documentInfo.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{verification.document.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`documentTypes.${verification.document.type}`)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.documentInfo.type")}
                  </span>
                  <span className="text-sm">
                    {verification.document.mimeType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.documentInfo.size")}
                  </span>
                  <span className="text-sm">
                    {(verification.document.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.documentInfo.uploadedAt")}
                  </span>
                  <span className="text-sm">
                    {format(new Date(verification.document.uploadedAt), "PPP", { locale })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.documentInfo.status")}
                  </span>
                  <Badge
                    variant={
                      verification.status === "APPROVED"
                        ? "success"
                        : verification.status === "REJECTED"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {verification.status === "APPROVED" && (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    {verification.status === "REJECTED" && (
                      <X className="mr-1 h-3 w-3" />
                    )}
                    {verification.status === "PENDING" && (
                      <Clock className="mr-1 h-3 w-3" />
                    )}
                    {t(`status.${verification.status}`)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isPending && (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.actions.title")}</CardTitle>
                <CardDescription>
                  {t("detail.actions.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => setIsApproveDialogOpen(true)}
                  disabled={approveVerification.isLoading}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {t("detail.actions.approve")}
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => setIsRejectDialogOpen(true)}
                  disabled={rejectVerification.isLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t("detail.actions.reject")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.approval.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("detail.approval.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="notes">
                {t("detail.approval.dialog.notes.label")}
              </Label>
              <Textarea
                id="notes"
                placeholder={t("detail.approval.dialog.notes.placeholder")}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("detail.approval.dialog.notes.help")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={approveVerification.isLoading}
            >
              {t("detail.approval.dialog.actions.cancel")}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveVerification.isLoading}
            >
              {approveVerification.isLoading ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  {t("detail.approval.dialog.actions.loading")}
                </span>
              ) : (
                <span className="flex items-center">
                  <Check className="mr-2 h-4 w-4" />
                  {t("detail.approval.dialog.actions.confirm")}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.rejection.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("detail.rejection.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reason" className="required">
                {t("detail.rejection.dialog.reason.label")}
              </Label>
              <Textarea
                id="reason"
                placeholder={t("detail.rejection.dialog.reason.placeholder")}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("detail.rejection.dialog.reason.help")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={rejectVerification.isLoading}
            >
              {t("detail.rejection.dialog.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectVerification.isLoading || !rejectionReason.trim()}
            >
              {rejectVerification.isLoading ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  {t("detail.rejection.dialog.actions.loading")}
                </span>
              ) : (
                <span className="flex items-center">
                  <X className="mr-2 h-4 w-4" />
                  {t("detail.rejection.dialog.actions.confirm")}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VerificationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 px-6 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-32" />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex">
                  <Skeleton className="h-10 w-10 rounded-full mr-4" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <Separator />
                <div className="flex">
                  <Skeleton className="h-10 w-10 rounded-full mr-4" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  {Array.from({ length: 4  }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4  }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
