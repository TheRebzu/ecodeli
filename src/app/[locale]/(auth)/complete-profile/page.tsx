"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DocumentValidation } from "@/components/auth/document-validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileText, User } from "lucide-react";
import { UserRole } from "@prisma/client";

interface Document {
  id: string;
  type: string;
  validationStatus: string;
}

export default function CompleteProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      checkProfileCompleteness();
    }
  }, [status, router]);

  const checkProfileCompleteness = async () => {
    try {
      const response = await fetch("/api/upload");
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du profil:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRequiredDocuments = (role: UserRole) => {
    const requirements: Record<UserRole, string[]> = {
      CLIENT: [],
      ADMIN: [],
      DELIVERER: ["IDENTITY", "INSURANCE"],
      PROVIDER: ["IDENTITY", "CERTIFICATION", "INSURANCE"],
      MERCHANT: ["IDENTITY", "CERTIFICATION", "INSURANCE"],
    };
    return requirements[role] || [];
  };

  const isProfileComplete = () => {
    if (!session?.user) return false;
    
    const requiredDocs = getRequiredDocuments(session.user.role);
    if (requiredDocs.length === 0) return true;
    
    return requiredDocs.every(docType => 
      documents.some(doc => doc.type === docType)
    );
  };

  const handleSubmitForValidation = async () => {
    if (!session?.user) return;
    
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/submit-for-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Rediriger vers le dashboard avec un message de succès
        const locale = window.location.pathname.split("/")[1] || "fr";
        router.push(`/${locale}/dashboard?message=Documents soumis pour validation`);
      } else {
        throw new Error(data.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      alert("Erreur lors de la soumission pour validation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipForNow = () => {
    const locale = window.location.pathname.split("/")[1] || "fr";
    router.push(`/${locale}/dashboard`);
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const requiredDocs = getRequiredDocuments(session.user.role);
  const profileComplete = isProfileComplete();

  // Si le rôle n'a pas besoin de documents, rediriger directement
  if (requiredDocs.length === 0) {
    const locale = window.location.pathname.split("/")[1] || "fr";
    router.push(`/${locale}/dashboard`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-full bg-green-600 mx-auto mb-4 flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finalisation de votre profil
          </h1>
          <p className="text-gray-600">
            Bonjour {session.user.name}, merci de compléter votre profil pour commencer à utiliser EcoDeli
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Statut de validation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileComplete ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Tous les documents requis ont été téléchargés ! Vous pouvez maintenant soumettre votre profil pour validation.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Veuillez télécharger tous les documents obligatoires avant de pouvoir soumettre votre profil pour validation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Document Validation Component */}
        <DocumentValidation
          userRole={session.user.role}
          userId={session.user.id}
          onDocumentsChange={setDocuments}
        />

        {/* Actions */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={handleSkipForNow}
          >
            Passer pour l'instant
          </Button>
          
          <Button
            onClick={handleSubmitForValidation}
            disabled={!profileComplete || submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Soumission en cours..." : "Soumettre pour validation"}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Après soumission, vos documents seront vérifiés par nos équipes sous 24-48h. 
            Vous recevrez une notification par email une fois la validation terminée.
          </p>
        </div>
      </div>
    </div>
  );
}