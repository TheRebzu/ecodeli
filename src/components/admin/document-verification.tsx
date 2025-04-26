"use client";

import { useState, useEffect } from "react";
import { useDocuments } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentStatus, DocumentType } from "@prisma/client";

interface DocumentVerificationProps {
  userRole?: 'DELIVERER' | 'PROVIDER';
}

export function DocumentVerification({ userRole }: DocumentVerificationProps) {
  const [activeTab, setActiveTab] = useState<string>("pending");
  const { 
    pendingDocuments, 
    approveDocument, 
    rejectDocument,
    loadPendingDocuments,
    isLoading 
  } = useDocuments();
  
  // Filtrer les documents selon le rôle utilisateur si spécifié
  const filteredDocuments = userRole 
    ? pendingDocuments.filter(doc => doc.userRole === userRole)
    : pendingDocuments;

  useEffect(() => {
    loadPendingDocuments(userRole);
  }, [userRole]);

  const handleApprove = async (documentId: string) => {
    await approveDocument(documentId);
    loadPendingDocuments(userRole);
  };

  const handleReject = async (documentId: string, reason: string) => {
    await rejectDocument(documentId, reason);
    loadPendingDocuments(userRole);
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels = {
      ID_CARD: "Carte d'identité",
      DRIVER_LICENSE: "Permis de conduire",
      VEHICLE_REGISTRATION: "Carte grise",
      INSURANCE: "Assurance",
      CRIMINAL_RECORD: "Casier judiciaire",
      PROFESSIONAL_CERTIFICATION: "Certification professionnelle",
      OTHER: "Autre document"
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vérification des documents</h1>
        <Badge variant="outline">{filteredDocuments.length} en attente</Badge>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvés</TabsTrigger>
          <TabsTrigger value="rejected">Refusés</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Aucun document en attente</p>
              </CardContent>
            </Card>
          ) : (
            filteredDocuments.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-medium">
                      {getDocumentTypeLabel(doc.type)}
                    </CardTitle>
                    <Badge>
                      {doc.userRole}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Soumis par: {doc.userName} ({doc.userEmail})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Le {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-3">
                    <div className="rounded-md overflow-hidden">
                      <a 
                        href={`/api/documents/${doc.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline text-sm"
                      >
                        Voir le document
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        onClick={() => handleApprove(doc.id)}
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        Approuver
                      </Button>
                      <Button
                        onClick={() => handleReject(doc.id, "Document invalide ou incomplet")}
                        variant="destructive"
                        size="sm"
                        className="w-full"
                      >
                        Refuser
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Fonctionnalité à venir
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Fonctionnalité à venir
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
