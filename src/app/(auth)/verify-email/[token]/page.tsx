"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc-client";

export default function VerifyEmailPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (error: { message: string }) => {
      setStatus("error");
      setErrorMessage(error.message || "Une erreur s&apos;est produite lors de la vérification de votre email.");
    }
  });
  
  useEffect(() => {
    verifyEmailMutation.mutate({ token: params.token });
  }, [params.token]);
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Vérification d&apos;email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 py-6">
          {status === "loading" && (
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p>Vérification de votre email en cours...</p>
            </div>
          )}
          
          {status === "success" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold">Email vérifié avec succès!</h3>
              <p>Votre adresse email a été vérifiée. Vous pouvez maintenant vous connecter à votre compte.</p>
            </div>
          )}
          
          {status === "error" && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <XCircle className="h-16 w-16 text-red-500" />
              <h3 className="text-xl font-semibold">Échec de la vérification</h3>
              <p>{errorMessage}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push("/login")} className="w-full">
            {status === "success" ? "Se connecter" : "Retourner à la page de connexion"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 