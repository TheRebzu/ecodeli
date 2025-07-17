"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface EmailTestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export function EmailTests() {
  const [email, setEmail] = useState("");
  const [emailType, setEmailType] = useState("verification");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EmailTestResult[]>([]);

  const emailTemplates = [
    {
      value: "verification",
      label: "Vérification email",
      description: "Email de vérification de compte",
    },
    {
      value: "password-reset",
      label: "Réinitialisation mot de passe",
      description: "Email de récupération",
    },
    {
      value: "booking-confirmation",
      label: "Confirmation de réservation",
      description: "Email de confirmation de réservation client",
    },
    {
      value: "new-booking-notification",
      label: "Notification nouvelle réservation",
      description: "Email de notification pour le prestataire",
    },
    {
      value: "custom",
      label: "Email personnalisé",
      description: "Email avec contenu personnalisé",
    },
  ];

  const handleSendTestEmail = async () => {
    if (!email) {
      setResults((prev) => [
        ...prev,
        {
          success: false,
          message: "Veuillez saisir une adresse email",
          timestamp: new Date().toLocaleString(),
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/tests/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          type: emailType,
          subject: customSubject,
          message: customMessage,
        }),
      });

      const data = await response.json();

      setResults((prev) => [
        ...prev,
        {
          success: response.ok,
          message:
            data.message ||
            (response.ok
              ? "Email envoyé avec succès"
              : "Erreur lors de l'envoi"),
          timestamp: new Date().toLocaleString(),
        },
      ]);
    } catch (error) {
      setResults((prev) => [
        ...prev,
        {
          success: false,
          message: "Erreur de connexion au serveur",
          timestamp: new Date().toLocaleString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration Email
          </CardTitle>
          <CardDescription>
            Configurez et testez l'envoi d'emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email de test</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-type">Type d'email</Label>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      <div>
                        <div className="font-medium">{template.label}</div>
                        <div className="text-xs text-gray-500">
                          {template.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {emailType === "custom" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet personnalisé</Label>
                <Input
                  id="subject"
                  placeholder="Sujet de l'email"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message personnalisé</Label>
                <Textarea
                  id="message"
                  placeholder="Contenu de l'email..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSendTestEmail}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer Email de Test
            </Button>

            <Button
              variant="outline"
              onClick={clearResults}
              disabled={results.length === 0}
            >
              Effacer les résultats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats des Tests</CardTitle>
            <CardDescription>
              Historique des tests d'envoi d'emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <Alert
                  key={index}
                  variant={result.success ? "default" : "destructive"}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>{result.message}</span>
                        <Badge variant="secondary" className="text-xs">
                          {result.timestamp}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Informations Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Les emails de test sont envoyés en mode développement</p>
            <p>
              • Vérifiez votre dossier spam si vous ne recevez pas les emails
            </p>
            <p>
              • Les templates utilisent les variables de configuration du
              système
            </p>
            <p>
              • Les logs d'envoi sont disponibles dans la console du serveur
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
