"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VerificationNoticeProps {
  className?: string;
}

export function VerificationNotice({ className }: VerificationNoticeProps) {
  const { data: session, update } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Vérifier si l'utilisateur a besoin de vérification
  const needsVerification = session?.user && !session.user.isActive;

  if (!needsVerification || isVerified) {
    return null;
  }

  const handleSendVerificationEmail = async () => {
    setIsSending(true);
    
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session?.user?.email,
        }),
      });

      if (response.ok) {
        toast.success("Email de vérification envoyé !");
        setIsVerified(true);
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de l'envoi de l'email");
      }
    } catch (error) {
      console.error("Erreur envoi email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setIsSending(false);
    }
  };

  const getRoleMessage = () => {
    switch (session?.user?.role) {
      case "DELIVERER":
        return "Votre compte livreur nécessite une validation. Veuillez vérifier votre email et cliquer sur le lien de validation.";
      case "PROVIDER":
        return "Votre compte prestataire nécessite une validation. Veuillez vérifier votre email et cliquer sur le lien de validation.";
      case "MERCHANT":
        return "Votre compte commerçant nécessite une validation. Veuillez vérifier votre email et cliquer sur le lien de validation.";
      default:
        return "Votre compte nécessite une validation. Veuillez vérifier votre email et cliquer sur le lien de validation.";
    }
  };

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
          <AlertCircle className="h-5 w-5" />
          Validation de compte requise
        </CardTitle>
        <CardDescription className="text-orange-700">
          {getRoleMessage()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            Votre compte est en attente de validation. Vous pouvez continuer à utiliser l'application, 
            mais certaines fonctionnalités seront limitées jusqu'à la validation.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            onClick={handleSendVerificationEmail}
            disabled={isSending}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {isSending ? "Envoi..." : "Renvoyer l'email de vérification"}
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.href = "/fr/login"}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            J'ai déjà vérifié
          </Button>
        </div>

        <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
          💡 <strong>Conseil :</strong> Vérifiez votre dossier spam si vous ne recevez pas l'email.
        </div>
      </CardContent>
    </Card>
  );
} 