"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UserValidationForm } from "@/features/auth/components/user-validation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Shield } from "lucide-react";
import Link from "next/link";
import type { UserRole } from "@prisma/client";

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  profile?: {
    verified: boolean;
  };
}

import { useTranslations } from "next-intl";

function ValidateUserContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = searchParams.get("userId");
        if (!userId) {
          setError("ID utilisateur manquant");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/admin/users/${userId}/validation`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setUserData(data.user);
        } else {
          setError(data.error || "Erreur lors du chargement des données");
        }
      } catch (err) {
        setError("Erreur de connexion");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [searchParams]);

  const handleValidationComplete = () => {
    router.push("/admin/users?tab=pending");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("auth.validation.loading") || "Chargement..."}
          </h2>
          <p className="text-gray-600">
            {t("auth.validation.loadingMessage") ||
              "Chargement des données de validation..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-600">
              {t("auth.validation.error") || "Erreur"}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/users">
                {t("common.back") || "Retour"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-600">
              {t("auth.validation.userNotFound") || "Utilisateur non trouvé"}
            </CardTitle>
            <CardDescription>
              {t("auth.validation.userNotFoundMessage") ||
                "L'utilisateur demandé n'existe pas."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/users">
                {t("common.back") || "Retour"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <CardTitle className="text-2xl">
                  {t("auth.validation.title") || "Validation d'utilisateur"}
                </CardTitle>
                <CardDescription>
                  {t("auth.validation.description") ||
                    "Examiner et valider les informations de l'utilisateur"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("auth.validation.userInfo") || "Informations utilisateur"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-600">
                  {t("common.email") || "Email"}:
                </span>
                <p className="text-gray-900">{userData.email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">
                  {t("common.role") || "Rôle"}:
                </span>
                <p className="text-gray-900">{userData.role}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">
                  {t("auth.validation.emailVerified") || "Email vérifié"}:
                </span>
                <p className="text-gray-900">
                  {userData.emailVerified
                    ? t("common.yes") || "Oui"
                    : t("common.no") || "Non"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">
                  {t("auth.validation.profileVerified") || "Profil vérifié"}:
                </span>
                <p className="text-gray-900">
                  {userData.profile?.verified
                    ? t("common.yes") || "Oui"
                    : t("common.no") || "Non"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("auth.validation.validationProcess") ||
                "Processus de validation"}
            </CardTitle>
            <CardDescription>
              {t("auth.validation.validationProcessDescription") ||
                "Examinez les documents et validez ou rejetez cette demande"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserValidationForm
              userId={userData.id}
              userRole={userData.role}
              onValidationComplete={handleValidationComplete}
            />
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/admin/users?tab=pending">
              {t("common.back") || "Retour à la liste"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ValidateUserPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement...</p>
        </div>
      </div>
    }>
      <ValidateUserContent />
    </Suspense>
  );
}
