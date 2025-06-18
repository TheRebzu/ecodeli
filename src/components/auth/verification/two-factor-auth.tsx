"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Smartphone } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

interface TwoFactorAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
  userId?: string;
}

export default function TwoFactorAuth({ 
  onSuccess, 
  onError, 
  isLoading = false,
  userId 
}: TwoFactorAuthProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Mutation pour vérifier le code 2FA
  const verify2FAMutation = api.auth.verify2FA.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Authentification réussie",
          description: "Code 2FA vérifié avec succès",
        });
        onSuccess?.();
      } else {
        const errorMsg = result.message || "Code incorrect";
        setError(errorMsg);
        onError?.(errorMsg);
        toast({
          title: "Erreur d'authentification",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      const errorMsg = error.message || "Erreur de vérification";
      setError(errorMsg);
      onError?.(errorMsg);
      toast({
        title: "Erreur de vérification",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  // Mutation pour renvoyer le code
  const resend2FAMutation = api.auth.resend2FA.useMutation({
    onSuccess: () => {
      toast({
        title: "Code renvoyé",
        description: "Un nouveau code a été envoyé sur votre application d'authentification",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres");
      return;
    }

    // Appel API réel pour vérifier le code 2FA
    verify2FAMutation.mutate({
      code: code.trim(),
      userId: userId || undefined,
    });
  };

  const handleResendCode = () => {
    resend2FAMutation.mutate({
      userId: userId || undefined,
    });
  };

  const isSubmitting = isLoading || verify2FAMutation.isLoading;
  const isResending = resend2FAMutation.isLoading;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle>Authentification à deux facteurs</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Code de vérification
            </label>
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-gray-400" />
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                  setError("");
                }}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                disabled={isSubmitting}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-gray-500">
              Entrez le code à 6 chiffres de votre application d'authentification
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || code.length !== 6}
            >
              {isSubmitting ? "Vérification..." : "Vérifier"}
            </Button>

            <Button 
              type="button"
              variant="outline"
              className="w-full" 
              disabled={isResending}
              onClick={handleResendCode}
            >
              {isResending ? "Envoi..." : "Renvoyer le code"}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Vous ne recevez pas de code ? Vérifiez que l'heure de votre appareil est correcte.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Export nommé pour les imports
export { TwoFactorAuth };
