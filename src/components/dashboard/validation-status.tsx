"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Upload,
  RefreshCw 
} from "lucide-react";
import Link from "next/link";

interface Document {
  id: string;
  type: string;
  originalName: string;
  validationStatus: string;
  uploadedAt: string;
  rejectionReason?: string;
}

interface ValidationStatusProps {
  className?: string;
}

export function ValidationStatus({ className }: ValidationStatusProps) {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.user) {
      loadDocuments();
    }
  }, [session]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/upload");
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Erreur chargement documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "REJECTED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "PENDING":
      default:
        return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Validé";
      case "REJECTED":
        return "Rejeté";
      case "PENDING":
      default:
        return "En attente";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "default";
      case "REJECTED":
        return "destructive";
      case "PENDING":
      default:
        return "secondary";
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IDENTITY: "Pièce d'identité",
      DRIVING_LICENSE: "Permis de conduire",
      INSURANCE: "Assurance",
      CERTIFICATION: "Certification",
      CONTRACT: "Contrat",
      OTHER: "Autre",
    };
    return labels[type] || type;
  };

  // Ne pas afficher pour les clients et admins
  if (!session?.user || !["DELIVERER", "PROVIDER", "MERCHANT"].includes(session.user.role)) {
    return null;
  }

  const approvedDocs = documents.filter(doc => doc.validationStatus === "APPROVED");
  const rejectedDocs = documents.filter(doc => doc.validationStatus === "REJECTED");
  const pendingDocs = documents.filter(doc => doc.validationStatus === "PENDING");

  const getOverallStatus = () => {
    if (documents.length === 0) return "incomplete";
    if (rejectedDocs.length > 0) return "rejected";
    if (pendingDocs.length > 0) return "pending";
    return "approved";
  };

  const overallStatus = getOverallStatus();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Statut de validation</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut global */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Statut global:</span>
          <Badge variant={getStatusVariant(overallStatus)}>
            <div className="flex items-center space-x-1">
              {getStatusIcon(overallStatus)}
              <span>
                {overallStatus === "incomplete" && "Incomplet"}
                {overallStatus === "pending" && "En attente"}
                {overallStatus === "rejected" && "À corriger"}
                {overallStatus === "approved" && "Validé"}
              </span>
            </div>
          </Badge>
        </div>

        {/* Messages d'alerte */}
        {documents.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous n'avez pas encore téléchargé de documents. 
              <Link href="/complete-profile" className="text-blue-600 hover:underline ml-1">
                Compléter mon profil
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {rejectedDocs.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {rejectedDocs.length} document(s) rejeté(s). Veuillez les corriger et les re-télécharger.
            </AlertDescription>
          </Alert>
        )}

        {pendingDocs.length > 0 && approvedDocs.length === 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Vos documents sont en cours de validation. Vous recevrez une notification par email.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === "approved" && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Félicitations ! Tous vos documents ont été validés. Votre compte est maintenant pleinement actif.
            </AlertDescription>
          </Alert>
        )}

        {/* Liste des documents */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Documents téléchargés:</h4>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{getDocumentTypeLabel(doc.type)}</p>
                    <p className="text-xs text-gray-500">{doc.originalName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusVariant(doc.validationStatus)} className="text-xs">
                    {getStatusText(doc.validationStatus)}
                  </Badge>
                  {doc.validationStatus === "REJECTED" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/complete-profile">
                        <Upload className="h-3 w-3 mr-1" />
                        Corriger
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" asChild>
            <Link href="/complete-profile">
              <Upload className="h-4 w-4 mr-2" />
              Gérer mes documents
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}