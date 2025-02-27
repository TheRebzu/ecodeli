"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function VerifyEmailForm() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token de vérification manquant");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Une erreur est survenue");
        }

        setStatus("success");
        setMessage(result.message || "Email vérifié avec succès");

        // Redirection vers la page de connexion après 3 secondes
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Une erreur est survenue");
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Vérification de l'email</CardTitle>
        <CardDescription className="text-center">
          Nous validons votre adresse email
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-6">
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-center text-gray-600">
              Vérification de votre email en cours...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            <p className="text-center text-gray-600">
              Vous allez être redirigé vers la page de connexion...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      {status === "error" && (
        <CardFooter className="flex justify-center space-x-4">
          <Link href="/auth/signin">
            <Button variant="outline">Se connecter</Button>
          </Link>
          <Link href="/auth/signup">
            <Button>S'inscrire</Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}