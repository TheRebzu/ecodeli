"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Eye,
  Calendar,
  Download,
  Camera} from "lucide-react";
import { Link } from "@/navigation";
import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import DocumentManager from "@/components/deliverer/documents/document-manager";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function DelivererDocumentsPage() {
  useRoleProtection(["DELIVERER"]);
  const { data } = useSession();
  const t = useTranslations("documents");

  return (
    <div className="container py-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            {t("title", { default: "Mes Documents" })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("description", {
              default: "Gérez vos documents de vérification et leur statut"})}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/deliverer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back", { default: "Retour" })}
          </Link>
        </Button>
      </div>

      {/* Alerte de vérification */}
      {!session?.user?.isVerified && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex flex-col space-y-2">
              <span className="font-medium">
                {t("verification.required", {
                  default: "Vérification requise"})}
              </span>
              <span>
                {t("verification.description", {
                  default:
                    "Veuillez télécharger tous les documents requis pour activer votre compte livreur."})}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Compte vérifié */}
      {session?.user?.isVerified && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <span className="font-medium">
              {t("verification.verified", { default: "Compte vérifié" })}
            </span>
            <br />
            <span>
              {t("verification.verified.description", {
                default:
                  "Votre compte est vérifié. Vous pouvez gérer vos documents ci-dessous."})}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Gestionnaire de documents */}
      <DocumentManager />
    </div>
  );
}
