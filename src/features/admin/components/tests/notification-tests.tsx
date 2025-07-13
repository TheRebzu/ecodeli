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
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  Target,
} from "lucide-react";

interface NotificationTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  notificationId?: string;
}

export function NotificationTests() {
  const [title, setTitle] = useState("Test Notification EcoDeli");
  const [message, setMessage] = useState(
    "Ceci est un test de notification OneSignal",
  );
  const [targetType, setTargetType] = useState("all");
  const [targetValue, setTargetValue] = useState("");
  const [includeImage, setIncludeImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<NotificationTestResult[]>([]);

  const targetTypes = [
    {
      value: "all",
      label: "Tous les utilisateurs",
      description: "Envoi à tous les utilisateurs inscrits",
    },
    {
      value: "role",
      label: "Par rôle",
      description: "Envoi aux utilisateurs d'un rôle spécifique",
    },
    {
      value: "user",
      label: "Utilisateur spécifique",
      description: "Envoi à un utilisateur par email",
    },
    {
      value: "segment",
      label: "Segment personnalisé",
      description: "Envoi à un segment OneSignal",
    },
  ];

  const roles = [
    { value: "CLIENT", label: "Clients" },
    { value: "DELIVERER", label: "Livreurs" },
    { value: "MERCHANT", label: "Commerçants" },
    { value: "PROVIDER", label: "Prestataires" },
    { value: "ADMIN", label: "Administrateurs" },
  ];

  const handleSendTestNotification = async () => {
    if (!title || !message) {
      setResults((prev) => [
        ...prev,
        {
          success: false,
          message: "Veuillez saisir un titre et un message",
          timestamp: new Date().toLocaleString(),
        },
      ]);
      return;
    }

    if (targetType === "user" && !targetValue) {
      setResults((prev) => [
        ...prev,
        {
          success: false,
          message: "Veuillez saisir un email pour l'envoi ciblé",
          timestamp: new Date().toLocaleString(),
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/tests/notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          message,
          targetType,
          targetValue,
          includeImage,
          imageUrl,
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
              ? "Notification envoyée avec succès"
              : "Erreur lors de l'envoi"),
          timestamp: new Date().toLocaleString(),
          notificationId: data.notificationId,
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
            <Bell className="h-5 w-5" />
            Configuration Notification
          </CardTitle>
          <CardDescription>
            Configurez et testez l'envoi de notifications push OneSignal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la notification</Label>
              <Input
                id="title"
                placeholder="Titre de la notification"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-type">Type de ciblage</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {targetTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">
                          {type.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message de la notification</Label>
            <Textarea
              id="message"
              placeholder="Contenu de la notification..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {targetType === "role" && (
            <div className="space-y-2">
              <Label htmlFor="role">Rôle cible</Label>
              <Select value={targetValue} onValueChange={setTargetValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetType === "user" && (
            <div className="space-y-2">
              <Label htmlFor="user-email">Email utilisateur</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="utilisateur@example.com"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
          )}

          {targetType === "segment" && (
            <div className="space-y-2">
              <Label htmlFor="segment">ID du segment OneSignal</Label>
              <Input
                id="segment"
                placeholder="Segment ID"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="include-image"
              checked={includeImage}
              onCheckedChange={setIncludeImage}
            />
            <Label htmlFor="include-image">Inclure une image</Label>
          </div>

          {includeImage && (
            <div className="space-y-2">
              <Label htmlFor="image-url">URL de l'image</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSendTestNotification}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer Notification de Test
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
              Historique des tests de notifications
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
                        <div>
                          <span>{result.message}</span>
                          {result.notificationId && (
                            <Badge variant="secondary" className="ml-2">
                              ID: {result.notificationId}
                            </Badge>
                          )}
                        </div>
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
            Informations OneSignal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Les notifications sont envoyées via OneSignal</p>
            <p>
              • Vérifiez que les utilisateurs ont autorisé les notifications
            </p>
            <p>
              • Les notifications peuvent prendre quelques secondes à arriver
            </p>
            <p>• Les logs d'envoi sont disponibles dans la console OneSignal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
