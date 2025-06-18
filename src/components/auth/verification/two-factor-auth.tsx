"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Smartphone } from "lucide-react";

interface TwoFactorAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
}

export default function TwoFactorAuth({ 
  onSuccess, 
  onError, 
  isLoading = false 
}: TwoFactorAuthProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres");
      return;
    }

    try {
      // Simulation de vérification 2FA
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (code === "123456") {
        onSuccess?.();
      } else {
        const errorMsg = "Code incorrect";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = "Erreur de vérification";
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

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
                disabled={isLoading}
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

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? "Vérification..." : "Vérifier"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Export nommé pour les imports
export { TwoFactorAuth };
