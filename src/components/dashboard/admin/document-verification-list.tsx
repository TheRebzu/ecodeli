"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";

interface Document {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  documentType: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  fileUrl: string;
  description?: string;
}

export function DocumentVerificationList() {
  const t = useTranslations("dashboard.admin.documents");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // This would use the tRPC API in a real implementation
  // const { data: documents, isLoading, error, refetch } = api.documents.getPendingDocuments.useQuery();
  // const verifyDocument = api.documents.verifyDocument.useMutation();
  // const rejectDocument = api.documents.rejectDocument.useMutation();
  
  // Mock data for demonstration purposes
  const documents: Document[] = [
    {
      id: "doc1",
      userId: "user1",
      userName: "John Doe",
      userRole: "DELIVERER",
      documentType: "DRIVER_LICENSE",
      status: "PENDING",
      submittedAt: new Date().toISOString(),
      fileUrl: "/documents/license1.pdf",
      description: "Driver license for delivery services",
    },
    {
      id: "doc2",
      userId: "user2",
      userName: "Jane Smith",
      userRole: "MERCHANT",
      documentType: "BUSINESS_REGISTRATION",
      status: "PENDING",
      submittedAt: new Date(Date.now() - 86400000).toISOString(),
      fileUrl: "/documents/business1.pdf",
    },
    {
      id: "doc3",
      userId: "user3",
      userName: "Sam Wilson",
      userRole: "PROVIDER",
      documentType: "INSURANCE",
      status: "PENDING",
      submittedAt: new Date(Date.now() - 172800000).toISOString(),
      fileUrl: "/documents/insurance1.pdf",
      description: "Professional insurance certificate",
    },
  ];

  const isLoading = false;
  const error = null;
  
  const getDocumentTypeName = (type: string) => {
    const types: Record<string, string> = {
      ID_CARD: t("documentTypes.idCard"),
      DRIVER_LICENSE: t("documentTypes.driverLicense"),
      BUSINESS_REGISTRATION: t("documentTypes.businessRegistration"),
      INSURANCE: t("documentTypes.insurance"),
      OTHER: t("documentTypes.other"),
    };
    return types[type] || type;
  };
  
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      CLIENT: "bg-blue-100 text-blue-800",
      DELIVERER: "bg-green-100 text-green-800",
      MERCHANT: "bg-purple-100 text-purple-800",
      PROVIDER: "bg-orange-100 text-orange-800",
      ADMIN: "bg-red-100 text-red-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openDocumentReview = (doc: Document) => {
    setSelectedDocument(doc);
    setReviewNote("");
    setDialogOpen(true);
  };

  const handleVerifyDocument = () => {
    if (!selectedDocument) return;
    
    // In a real implementation, you would call the API
    // verifyDocument.mutate({
    //   documentId: selectedDocument.id,
    //   reviewNote,
    // }, {
    //   onSuccess: () => {
    //     refetch();
    //     setDialogOpen(false);
    //   }
    // });
    
    console.log("Document verified:", selectedDocument.id, reviewNote);
    setDialogOpen(false);
  };

  const handleRejectDocument = () => {
    if (!selectedDocument) return;
    
    // In a real implementation, you would call the API
    // rejectDocument.mutate({
    //   documentId: selectedDocument.id,
    //   reviewNote,
    // }, {
    //   onSuccess: () => {
    //     refetch();
    //     setDialogOpen(false);
    //   }
    // });
    
    console.log("Document rejected:", selectedDocument.id, reviewNote);
    setDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-40">
            <AlertCircle className="h-10 w-10 text-destructive mb-2" />
            <h3 className="text-lg font-medium">{t("error.title")}</h3>
            <p className="text-muted-foreground">{t("error.description")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-40">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">{t("empty.title")}</h3>
            <p className="text-muted-foreground">{t("empty.description")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.user")}</TableHead>
                <TableHead>{t("table.role")}</TableHead>
                <TableHead>{t("table.type")}</TableHead>
                <TableHead>{t("table.submittedAt")}</TableHead>
                <TableHead>{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.userName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRoleBadgeColor(doc.userRole)}>
                      {doc.userRole}
                    </Badge>
                  </TableCell>
                  <TableCell>{getDocumentTypeName(doc.documentType)}</TableCell>
                  <TableCell>{formatDate(doc.submittedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDocumentReview(doc)}
                    >
                      {t("actions.review")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("review.title")}</DialogTitle>
            <DialogDescription>
              {t("review.description")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t("review.user")}</Label>
                  <p className="font-medium">{selectedDocument.userName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("review.role")}</Label>
                  <p className="font-medium">{selectedDocument.userRole}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">{t("review.documentType")}</Label>
                <p className="font-medium">{getDocumentTypeName(selectedDocument.documentType)}</p>
              </div>
              
              {selectedDocument.description && (
                <div>
                  <Label className="text-muted-foreground">{t("review.description")}</Label>
                  <p>{selectedDocument.description}</p>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">{t("review.document")}</Label>
                <div className="border rounded-md p-4 flex items-center justify-center h-40 bg-muted/50">
                  <Button variant="outline" asChild>
                    <a href={selectedDocument.fileUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      {t("review.viewDocument")}
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="review-note">{t("review.notes")}</Label>
                <Textarea
                  id="review-note"
                  placeholder={t("review.notesPlaceholder")}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={handleRejectDocument}>
              <XCircle className="mr-2 h-4 w-4" />
              {t("review.reject")}
            </Button>
            <Button onClick={handleVerifyDocument}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("review.verify")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 