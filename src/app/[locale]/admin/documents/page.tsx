"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  User,
  Download,
  RefreshCw
} from "lucide-react";
import { DocumentViewer } from "@/components/admin/document-viewer";

interface Document {
  id: string;
  type: string;
  filename: string;
  originalName: string;
  url: string;
  validationStatus: string;
  createdAt: string;
  rejectionReason?: string;
  user: {
    id: string;
    email: string;
    role: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface ValidationStats {
  pending: number;
  approved: number;
  rejected: number;
  deliverersPending: number;
  providersPending: number;
}

export default function AdminDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<ValidationStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    deliverersPending: 0,
    providersPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("pending");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (session?.user.role !== "ADMIN") {
        router.push("/");
      } else {
        loadDocuments();
      }
    }
  }, [status, session, router]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/documents/validate?status=${selectedTab.toUpperCase()}`);
      const data = await response.json();
      
      if (response.ok) {
        setDocuments(data.documents);
        setStats(data.stats);
      } else {
        console.error("Erreur:", data.error);
      }
    } catch (error) {
      console.error("Erreur chargement documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user.role === "ADMIN") {
      loadDocuments();
    }
  }, [selectedTab, session]);

  const handleValidation = async (documentId: string, action: "APPROVED" | "REJECTED", reason?: string) => {
    try {
      setValidating(documentId);
      const response = await fetch("/api/admin/documents/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action, reason }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Recharger les documents
        await loadDocuments();
        alert(`Document ${action === "APPROVED" ? "validé" : "rejeté"} avec succès`);
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error("Erreur validation:", error);
      alert("Erreur lors de la validation");
    } finally {
      setValidating(null);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IDENTITY: "Pièce d'identité",
      DRIVING_LICENSE: "Permis de conduire",
      INSURANCE: "Assurance RC",
      CERTIFICATION: "Certification/KBIS",
      CONTRACT: "Contrat",
      OTHER: "Autre",
    };
    return labels[type] || type;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      DELIVERER: "Livreur",
      PROVIDER: "Prestataire",
      MERCHANT: "Commerçant",
      CLIENT: "Client",
    };
    return labels[role] || role;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800">Validé</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Validation des documents</h1>
          <p className="text-gray-600">Gérez la validation des documents des livreurs et prestataires</p>
        </div>
        <Button onClick={loadDocuments} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Validés</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Rejetés</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Livreurs en attente</p>
                <p className="text-2xl font-bold">{stats.deliverersPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">En attente ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">Validés ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés ({stats.rejected})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab} className="mt-6">
              {documents.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Aucun document {selectedTab === "pending" ? "en attente" : selectedTab === "approved" ? "validé" : "rejeté"} pour le moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <FileText className="h-5 w-5 text-gray-500 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium">{getDocumentTypeLabel(doc.type)}</h3>
                                {getStatusBadge(doc.validationStatus)}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{doc.originalName}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  {doc.user.profile?.firstName} {doc.user.profile?.lastName} ({getRoleLabel(doc.user.role)})
                                </span>
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                              </div>
                              {doc.rejectionReason && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                  <strong>Raison du rejet:</strong> {doc.rejectionReason}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DocumentViewer
                              document={doc}
                              onValidate={handleValidation}
                              isValidating={validating === doc.id}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Télécharger
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}