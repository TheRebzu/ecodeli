"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Mail, User, FileText } from "lucide-react";
import Link from "next/link";

interface ValidationGuardProps {
  children: React.ReactNode;
  userId: string;
  redirectTo?: string;
  showValidationPage?: boolean;
}

interface ValidationStatus {
  emailVerified: boolean;
  profileVerified: boolean;
  documentsRequired: number;
  documentsSubmitted: number;
  documentsApproved: number;
  role: string;
}

export function ValidationGuard({
  children,
  userId,
  redirectTo = "/auth/validate-user",
  showValidationPage = true,
}: ValidationGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ValidationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkValidationStatus = async () => {
      try {
        const response = await fetch(
          `/api/auth/validation-status?userId=${userId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
        } else {
          setError("Impossible de vérifier le statut de validation");
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du statut:", error);
        setError("Erreur de connexion");
      } finally {
        setIsLoading(false);
      }
    };

    checkValidationStatus();
  }, [userId]);

  const isFullyValidated = () => {
    if (!status) return false;
    return (
      status.emailVerified &&
      status.profileVerified &&
      (status.documentsRequired === 0 ||
        status.documentsApproved === status.documentsRequired)
    );
  };

  const getValidationStep = () => {
    if (!status) return null;

    if (!status.emailVerified) {
      return {
        step: "email",
        title: "Email à vérifier",
        description: "Vous devez vérifier votre adresse email pour continuer.",
        icon: Mail,
        action: "Vérifier email",
        href: "/resend-verification",
      };
    }

    if (!status.profileVerified) {
      return {
        step: "profile",
        title: "Profil à compléter",
        description: "Complétez votre profil pour accéder à tous les services.",
        icon: User,
        action: "Compléter profil",
        href: "/validate-user",
      };
    }

    if (
      status.documentsRequired > 0 &&
      status.documentsApproved < status.documentsRequired
    ) {
      return {
        step: "documents",
        title: "Documents en attente",
        description:
          "Soumettez les documents requis pour finaliser votre validation.",
        icon: FileText,
        action: "Soumettre documents",
        href: "/documents/upload",
      };
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Vérification de votre compte...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur de validation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si l'utilisateur est entièrement validé, afficher le contenu
  if (isFullyValidated()) {
    return <>{children}</>;
  }

  // Si on ne veut pas afficher la page de validation, rediriger
  if (!showValidationPage) {
    const validationStep = getValidationStep();
    if (validationStep) {
      router.push(validationStep.href);
      return null;
    }
    return null;
  }

  // Afficher la page de validation
  const validationStep = getValidationStep();
  if (!validationStep) {
    return <>{children}</>;
  }

  const IconComponent = validationStep.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <IconComponent className="h-12 w-12 text-blue-500" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {validationStep.title}
          </CardTitle>
          <CardDescription>{validationStep.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Cette étape est nécessaire pour sécuriser votre compte et vous
              donner accès à tous les services EcoDeli.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href={validationStep.href}>{validationStep.action}</Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/support">Besoin d'aide ?</Link>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
