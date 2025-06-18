"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, Copy, Check, Smartphone, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function TwoFactorSetupPage() {
  const [step, setStep] = useState<"start" | "scan" | "verify" | "complete">("start");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Mutations
  const generateSecretMutation = api.auth.generateTwoFactorSecret.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("scan");
    },
    onError: (error) => {
      toast.error("Erreur", {
        description: error.message || "Impossible de générer le secret 2FA"
      });
    }
  });

  const verifyTwoFactorMutation = api.auth.verifyTwoFactorSetup.useMutation({
    onSuccess: () => {
      setStep("complete");
      toast.success("Authentification à deux facteurs activée", {
        description: "Votre compte est maintenant plus sécurisé"
      });
    },
    onError: (error) => {
      toast.error("Code incorrect", {
        description: error.message || "Veuillez vérifier le code et réessayer"
      });
    }
  });

  const handleStartSetup = () => {
    generateSecretMutation.mutate();
  };

  const handleVerifyCode = () => {
    if (verificationCode.length === 6) {
      verifyTwoFactorMutation.mutate({
        token: verificationCode,
        secret: secret
      });
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full space-y-6 p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">
              {step === "complete" ? "2FA Activée" : "Authentification à deux facteurs"}
            </CardTitle>
            <CardDescription>
              {step === "start" && "Sécurisez votre compte avec l'authentification à deux facteurs"}
              {step === "scan" && "Scannez le QR code avec votre application d'authentification"}
              {step === "verify" && "Entrez le code de vérification"}
              {step === "complete" && "Votre compte est maintenant sécurisé"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === "start" && (
              <>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte. 
                    Vous aurez besoin d'une application comme Google Authenticator ou Authy.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="text-sm">
                    <h4 className="font-medium mb-2">Applications recommandées :</h4>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Google Authenticator</li>
                      <li>Microsoft Authenticator</li>
                      <li>Authy</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleStartSetup} 
                    className="w-full"
                    disabled={generateSecretMutation.isPending}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    {generateSecretMutation.isPending ? "Génération..." : "Commencer la configuration"}
                  </Button>
                </div>
              </>
            )}

            {step === "scan" && (
              <>
                <div className="text-center space-y-4">
                  {qrCode && (
                    <div className="mx-auto bg-white p-4 rounded-lg border">
                      <img src={qrCode} alt="QR Code 2FA" className="mx-auto" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Ou entrez ce code manuellement :</Label>
                    <div className="flex gap-2">
                      <Input value={secret} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="sm" onClick={handleCopySecret}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setStep("verify")} className="w-full">
                  J'ai scanné le code
                </Button>
              </>
            )}

            {step === "verify" && (
              <>
                <div className="space-y-3">
                  <Label htmlFor="code">Code de vérification</Label>
                  <Input
                    id="code"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Entrez le code à 6 chiffres de votre application d'authentification
                  </p>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={handleVerifyCode} 
                    className="w-full"
                    disabled={verificationCode.length !== 6 || verifyTwoFactorMutation.isPending}
                  >
                    {verifyTwoFactorMutation.isPending ? "Vérification..." : "Vérifier et activer"}
                  </Button>
                  
                  <Button variant="outline" onClick={() => setStep("scan")} className="w-full">
                    Retour au QR code
                  </Button>
                </div>
              </>
            )}

            {step === "complete" && (
              <>
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    L'authentification à deux facteurs est maintenant activée sur votre compte. 
                    Vous devrez entrer un code de votre application à chaque connexion.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/dashboard">
                      Retour au tableau de bord
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/settings/security">
                      Paramètres de sécurité
                    </Link>
                  </Button>
                </div>
              </>
            )}

            <Separator />

            <div className="text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Annuler
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
