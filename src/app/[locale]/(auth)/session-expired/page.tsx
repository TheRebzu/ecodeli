"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function SessionExpiredPage() {
  const router = useRouter();

  useEffect(() => {
    // Nettoyer la session côté client
    signOut({ redirect: false });
  }, []);

  const handleReturnToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-orange-100 mb-4">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Session expirée</CardTitle>
            <CardDescription>
              Votre session a expiré pour des raisons de sécurité. Veuillez vous reconnecter pour continuer.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                Pour votre sécurité, nous vous déconnectons automatiquement après une période d'inactivité.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button onClick={handleReturnToLogin} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Se reconnecter
              </Button>
              
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">
                  Retour à l'accueil
                </Link>
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Besoin d'aide ? {" "}
                <Link href="/contact" className="text-primary hover:underline">
                  Contactez-nous
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
