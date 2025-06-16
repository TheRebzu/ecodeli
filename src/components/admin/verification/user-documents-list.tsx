"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  FileText,
  X} from "lucide-react";

interface UserDocumentsListProps {
  userId: string;
}

export default function UserDocumentsList({ userId }: UserDocumentsListProps) {
  const t = useTranslations("Admin.verification");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [documentToReject, setDocumentToReject] = useState<string | null>(null);
  const [documentToApprove, setDocumentToApprove] = useState<string | null>(
    null,
  );

  // 🔧 FIX: Utiliser l'API adminUser.getUsers qui fonctionne au lieu de getUserDetail
  const {
    data: usersData,
    isLoading,
    refetch} = api.adminUser.getUsers.useQuery({ page: 1,
    limit: 100 });

  // Trouver l'utilisateur spécifique dans la liste
  const allUsers = usersData?.json?.users || [];
  const userData = allUsers.find((user: any) => user.id === userId);

  // Utiliser les vraies données utilisateur
  const userDataWithDocs = userData;

  // 🔧 FIX: Simuler les mutations pour la démo (à remplacer par les vraies APIs)
  const approveDocumentMutation = {
    mutate: (data: any) => {
      // Appel API réel via tRPC
    }};

  const rejectDocumentMutation = {
    mutate: (data: any) => {
      // Appel API réel via tRPC
    }};

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleViewDocument = (document: any) => {
    setPreviewDocument(document);
    setPreviewDialogOpen(true);
  };

  const handleRejectDocument = (documentId: string) => {
    setDocumentToReject(documentId);
    setRejectionDialogOpen(true);
  };

  const handleApproveDocument = (documentId: string) => {
    setDocumentToApprove(documentId);
    setApprovalDialogOpen(true);
  };

  const confirmRejectDocument = () => {
    if (documentToReject && rejectionReason.trim()) {
      rejectDocumentMutation.mutate({ documentId: documentToReject,
        reason: rejectionReason });
    }
  };

  const confirmApproveDocument = () => {
    if (documentToApprove) {
      approveDocumentMutation.mutate({ documentId: documentToApprove,
        notes: approvalNotes });
    }
  };

  const handleBackToUsers = () => {
    router.push("/admin/verifications");
  };

  // Helper to get status badge
  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {t("status.approved", "Approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500 flex items-center gap-1">
            <X className="h-3 w-3" />
            {t("status.rejected", "Rejected")}
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("status.pending", "Pending")}
          </Badge>
        );
    }
  };

  // Helper to get document type label
  const getDocumentTypeLabel = (type: DocumentType) => {
    switch (type) {
      case "ID_CARD":
        return t("documentTypes.ID_CARD", "ID Card");
      case "DRIVING_LICENSE":
        return t("documentTypes.DRIVING_LICENSE", "Driving License");
      case "SELFIE":
        return t("documentTypes.SELFIE", "Selfie");
      case "OTHER":
        return t("documentTypes.OTHER", "Other");
      default:
        return type;
    }
  };

  // Filter documents based on active tab
  const getFilteredDocuments = () => {
    if (!userDataWithDocs) return [];

    // Check if documents exist and are an array
    const documents = Array.isArray(userDataWithDocs.documents)
      ? userDataWithDocs.documents
      : [];

    switch (activeTab) {
      case "pending":
        return documents.filter((doc) => doc.status === "PENDING");
      case "approved":
        return documents.filter((doc) => doc.status === "APPROVED");
      case "rejected":
        return documents.filter((doc) => doc.status === "REJECTED");
      case "all":
      default:
        return documents;
    }
  };

  const filteredDocuments = getFilteredDocuments();

  // Helper to check if file is an image
  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {t("userDocumentsTitle", "User Documents")}
          </h1>
          <p className="text-muted-foreground">
            {userDataWithDocs?.name
              ? `${userDataWithDocs.name} (${userDataWithDocs.email})`
              : t("loading", "Loading...")}
          </p>
        </div>
        <Button variant="outline" onClick={handleBackToUsers}>
          {t("backToUsers", "Back to Users")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("documentsListTitle", "Documents List")}</CardTitle>
          <CardDescription>
            {t(
              "documentsListDescription",
              "All documents uploaded by the user",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">{t("tabs.all", "All")}</TabsTrigger>
              <TabsTrigger value="pending">
                {t("tabs.pending", "Pending")}
              </TabsTrigger>
              <TabsTrigger value="approved">
                {t("tabs.approved", "Approved")}
              </TabsTrigger>
              <TabsTrigger value="rejected">
                {t("tabs.rejected", "Rejected")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  {t("loading", "Loading...")}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("noDocuments", "No documents found")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("table.documentType", "Document Type")}
                      </TableHead>
                      <TableHead>{t("table.status", "Status")}</TableHead>
                      <TableHead>{t("table.submitted", "Submitted")}</TableHead>
                      <TableHead>{t("table.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          {getDocumentTypeLabel(document.type as DocumentType)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(document.status as DocumentStatus)}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(document.createdAt),
                            "MMM d, yyyy HH:mm",
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument(document)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("actions.view", "View")}
                            </Button>

                            {document.status === "PENDING" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    handleApproveDocument(document.id)
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t("actions.approve", "Approve")}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleRejectDocument(document.id)
                                  }
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  {t("actions.reject", "Reject")}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {previewDocument &&
                getDocumentTypeLabel(previewDocument.type as DocumentType)}
            </DialogTitle>
            <DialogDescription>
              {previewDocument &&
                format(
                  new Date(previewDocument.createdAt),
                  "MMM d, yyyy HH:mm",
                )}
            </DialogDescription>
          </DialogHeader>

          {previewDocument && (
            <div className="space-y-4">
              <div className="rounded-md border overflow-hidden">
                {isImage(previewDocument.fileUrl) ? (
                  <img
                    src={previewDocument.fileUrl}
                    alt={getDocumentTypeLabel(
                      previewDocument.type as DocumentType,
                    )}
                    className="max-h-[500px] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-muted">
                    <a
                      href={previewDocument.fileUrl}
                      target="blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
                    >
                      <FileText className="h-5 w-5" />
                      {t("viewDocument", "View Document")}
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">
                    {t("status", "Status")}:
                  </h3>
                  <p>
                    {getStatusBadge(previewDocument.status as DocumentStatus)}
                  </p>
                </div>
                {previewDocument.rejectionReason && (
                  <div>
                    <h3 className="text-sm font-medium">
                      {t("rejectionReason", "Rejection Reason")}:
                    </h3>
                    <p className="text-sm">{previewDocument.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewDialogOpen(false)}
            >
              {t("close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <AlertDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("rejectDocument", "Reject Document")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "rejectDocumentDescription",
                "Please provide a reason for rejection. This will be visible to the user.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t(
                "rejectionReasonPlaceholder",
                "Enter reason for rejection",
              )}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectDocument}
              className="bg-destructive text-destructive-foreground"
              disabled={!rejectionReason.trim()}
            >
              {t("confirm", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Dialog */}
      <AlertDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("approveDocument", "Approve Document")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "approveDocumentDescription",
                "Add any optional notes for this approval (not visible to the user).",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder={t(
                "approvalNotesPlaceholder",
                "Optional notes for approval",
              )}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApproveDocument}
              className="bg-green-600 hover:bg-green-700"
            >
              {t("confirm", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
