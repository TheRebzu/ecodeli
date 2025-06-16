"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { UserRole, DocumentType, VerificationStatus } from "@prisma/client";
import {
  Check,
  X,
  FileText,
  User,
  Calendar,
  Clock,
  AlertTriangle} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";

// Types pour les documents à vérifier
interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  filename: string;
  fileUrl: string;
  uploadedAt: Date;
  expiryDate?: Date;
  status: VerificationStatus;
  userRole: UserRole;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Import de la fonction partagée pour afficher le nom du type de document
import { getDocumentTypeName } from "@/utils/document-utils";

export function DocumentVerification() {
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    UserRole.DELIVERER,
  );
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("Admin.Verification");

  // Récupérer les documents en attente pour un rôle spécifique
  const {
    data: documentsData,
    isLoading,
    refetch} = api.document.getPendingDocuments.useQuery(
    { userRole },
    { refetchOnWindowFocus },
  );

  // Mutation pour approuver ou rejeter un document
  const verifyDocument = api.auth.verifyDocument.useMutation({ onSuccess: () => {
      toast({
        title: t("documents.success.title"),
        description: t("documents.success.description") });
      refetch();
    },
    onError: (error) => {
      toast({ title: t("documents.error.title"),
        description: error.message,
        variant: "destructive" });
    }});

  // Gérer l'approbation d'un document
  const handleApprove = async (documentId: string) => {
    await verifyDocument.mutateAsync({ documentId,
      status: "APPROVED" });
  };

  // Gérer le rejet d'un document
  const handleReject = async (documentId: string) => {
    await verifyDocument.mutateAsync({ documentId,
      status: "REJECTED",
      notes: rejectNotes[documentId] || t("documents.defaultRejectionReason") });

    // Effacer les notes après soumission
    setRejectNotes((prev) => {
      const updated = { ...prev };
      delete updated[documentId];
      return updated;
    });
  };

  // Basculer l'affichage détaillé d'un document
  const toggleDocumentDetails = (documentId: string) => {
    setExpandedDocumentId(
      expandedDocumentId === documentId ? null : documentId,
    );
  };

  // Mettre à jour les notes de rejet
  const updateRejectNotes = (documentId: string, notes: string) => {
    setRejectNotes((prev) => ({ ...prev,
      [documentId]: notes }));
  };

  // Obtenir les documents en attente
  const pendingDocuments = documentsData?.documents || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("documents.title")}</CardTitle>
        <CardDescription>{t("documents.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue={UserRole.DELIVERER}
          onValueChange={(value) => setSelectedRole(value as UserRole)}
        >
          <TabsList className="mb-6">
            <TabsTrigger value={UserRole.DELIVERER}>
              {t("roles.deliverer")}
            </TabsTrigger>
            <TabsTrigger value={UserRole.MERCHANT}>
              {t("roles.merchant")}
            </TabsTrigger>
            <TabsTrigger value={UserRole.PROVIDER}>
              {t("roles.provider")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={UserRole.DELIVERER} className="space-y-4">
            {renderDocumentsList(UserRole.DELIVERER)}
          </TabsContent>

          <TabsContent value={UserRole.MERCHANT} className="space-y-4">
            {renderDocumentsList(UserRole.MERCHANT)}
          </TabsContent>

          <TabsContent value={UserRole.PROVIDER} className="space-y-4">
            {renderDocumentsList(UserRole.PROVIDER)}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={() => router.push("/admin")}>
          {t("actions.backToDashboard")}
        </Button>
      </CardFooter>
    </Card>
  );

  // Fonction pour render la liste des documents par rôle
  function renderDocumentsList(role: UserRole) {
    const roleDocuments = pendingDocuments.filter(
      (doc) => doc.userRole === role,
    );

    if (isLoading) {
      return (
        <div className="flex justify-center py-6">
          <p>{t("loading")}</p>
        </div>
      );
    }

    if (roleDocuments.length === 0) {
      return (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">
            {t("documents.noDocuments.title")}
          </h3>
          <p className="text-muted-foreground">
            {t("documents.noDocuments.description")}
          </p>
        </div>
      );
    }

    return roleDocuments.map((document) => (
      <Card key={document.id} className="border border-muted">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              {" "}
              <CardTitle className="text-base font-medium">
                {getDocumentTypeName(document.type)}
              </CardTitle>
              <CardDescription>{document.filename}</CardDescription>
            </div>
            <Badge variant="outline">
              {t(`documents.status.${document.status.toLowerCase()}`)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>
                {document.user.name} ({ document.user.email })
              </span>
            </div>

            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>
                {t("documents.uploadedAt")}:{" "}
                {format(new Date(document.uploadedAt), "PPP", { locale })}
              </span>
            </div>

            {document.expiryDate && (
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>
                  {t("documents.expiresAt")}:{" "}
                  {format(new Date(document.expiryDate), "PPP", { locale })}
                </span>
              </div>
            )}
          </div>

          {/* Afficher le document si sélectionné */}
          {expandedDocumentId === document.id && (
            <div className="mt-4 border rounded-md p-2">
              {document.fileUrl.toLowerCase().endsWith(".pdf") ? (
                <div className="bg-muted/20 p-4 text-center rounded">
                  <FileText className="h-10 w-10 mx-auto mb-2" />
                  <a
                    href={document.fileUrl}
                    target="blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {t("documents.viewPdf")}
                  </a>
                </div>
              ) : (
                <img
                  src={document.fileUrl}
                  alt={document.filename}
                  className="max-h-64 mx-auto object-contain rounded"
                />
              )}

              {/* Champ pour les notes en cas de rejet */}
              <div className="mt-4">
                <Textarea
                  placeholder={t("documents.rejectionNotesPlaceholder")}
                  className="resize-none"
                  value={rejectNotes[document.id] || ""}
                  onChange={(e) =>
                    updateRejectNotes(document.id, e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  {t("documents.rejectionWarning")}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleDocumentDetails(document.id)}
          >
            {expandedDocumentId === document.id
              ? t("documents.actions.hideDocument")
              : t("documents.actions.viewDocument")}
          </Button>

          <div className="flex space-x-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleReject(document.id)}
              disabled={verifyDocument.isLoading}
            >
              <X className="h-4 w-4 mr-1" />
              {t("documents.actions.reject")}
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => handleApprove(document.id)}
              disabled={verifyDocument.isLoading}
            >
              <Check className="h-4 w-4 mr-1" />
              {t("documents.actions.approve")}
            </Button>
          </div>
        </CardFooter>
      </Card>
    ));
  }
}

// Composant JsonView pour afficher des données JSON
export function JsonView({
  data,
  ...props
}: {
  data: any;
  [key: string]: any;
}) {
  return (
    <div
      className="p-4 border border-dashed border-gray-300 rounded-lg"
      {...props}
    >
      <p className="text-gray-500 text-center mb-2">Composant JsonView</p>
      <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
