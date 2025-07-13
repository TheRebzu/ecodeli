"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  Eye,
  Key,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";

interface SecuritySettingsProps {
  onSettingsChange: () => void;
}

export function SecuritySettings({ onSettingsChange }: SecuritySettingsProps) {
  const [settings, setSettings] = useState({
    // Authentification
    sessionTimeout: 24, // heures
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    requireEmailVerification: true,
    requirePhoneVerification: false,
    enableTwoFactor: true,

    // Mots de passe
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpiryDays: 90,

    // Sécurité réseau
    enableRateLimiting: true,
    maxRequestsPerMinute: 100,
    enableCORS: true,
    allowedOrigins: ["https://ecodeli.fr", "https://app.ecodeli.fr"],

    // Audit et logs
    enableAuditLogs: true,
    logRetentionDays: 365,
    enableIPWhitelist: false,
    whitelistedIPs: [],

    // Protection contre les attaques
    enableCSRFProtection: true,
    enableXSSProtection: true,
    enableSQLInjectionProtection: true,
    enableBruteForceProtection: true,
  });

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    onSettingsChange();
  };

  const getPasswordStrength = () => {
    let score = 0;
    if (settings.minPasswordLength >= 8) score++;
    if (settings.requireUppercase) score++;
    if (settings.requireLowercase) score++;
    if (settings.requireNumbers) score++;
    if (settings.requireSpecialChars) score++;

    if (score <= 2)
      return { level: "Faible", color: "text-red-600", bg: "bg-red-100" };
    if (score <= 3)
      return { level: "Moyen", color: "text-orange-600", bg: "bg-orange-100" };
    if (score <= 4)
      return { level: "Bon", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { level: "Fort", color: "text-green-600", bg: "bg-green-100" };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="space-y-6">
      {/* Authentification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Authentification</span>
          </CardTitle>
          <CardDescription>
            Configuration de l'authentification des utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sessionTimeout">
                Timeout de session (heures)
              </Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) =>
                  handleChange("sessionTimeout", parseInt(e.target.value))
                }
                min="1"
                max="168"
              />
            </div>

            <div>
              <Label htmlFor="maxLoginAttempts">
                Tentatives de connexion max
              </Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) =>
                  handleChange("maxLoginAttempts", parseInt(e.target.value))
                }
                min="3"
                max="10"
              />
            </div>

            <div>
              <Label htmlFor="lockoutDuration">
                Durée de verrouillage (min)
              </Label>
              <Input
                id="lockoutDuration"
                type="number"
                value={settings.lockoutDuration}
                onChange={(e) =>
                  handleChange("lockoutDuration", parseInt(e.target.value))
                }
                min="5"
                max="1440"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Vérification email obligatoire</Label>
                <p className="text-sm text-muted-foreground">
                  Exiger la vérification de l'email lors de l'inscription
                </p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) =>
                  handleChange("requireEmailVerification", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Vérification téléphone</Label>
                <p className="text-sm text-muted-foreground">
                  Exiger la vérification du numéro de téléphone
                </p>
              </div>
              <Switch
                checked={settings.requirePhoneVerification}
                onCheckedChange={(checked) =>
                  handleChange("requirePhoneVerification", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Authentification à deux facteurs</Label>
                <p className="text-sm text-muted-foreground">
                  Activer la 2FA pour les comptes sensibles
                </p>
              </div>
              <Switch
                checked={settings.enableTwoFactor}
                onCheckedChange={(checked) =>
                  handleChange("enableTwoFactor", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Politique des mots de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Politique des Mots de Passe</span>
            <Badge
              className={`${passwordStrength.bg} ${passwordStrength.color}`}
            >
              {passwordStrength.level}
            </Badge>
          </CardTitle>
          <CardDescription>
            Configuration de la complexité des mots de passe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minPasswordLength">Longueur minimale</Label>
              <Input
                id="minPasswordLength"
                type="number"
                value={settings.minPasswordLength}
                onChange={(e) =>
                  handleChange("minPasswordLength", parseInt(e.target.value))
                }
                min="6"
                max="32"
              />
            </div>

            <div>
              <Label htmlFor="passwordExpiryDays">Expiration (jours)</Label>
              <Input
                id="passwordExpiryDays"
                type="number"
                value={settings.passwordExpiryDays}
                onChange={(e) =>
                  handleChange("passwordExpiryDays", parseInt(e.target.value))
                }
                min="30"
                max="365"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Majuscules obligatoires</Label>
                <p className="text-sm text-muted-foreground">
                  Au moins une lettre majuscule
                </p>
              </div>
              <Switch
                checked={settings.requireUppercase}
                onCheckedChange={(checked) =>
                  handleChange("requireUppercase", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Minuscules obligatoires</Label>
                <p className="text-sm text-muted-foreground">
                  Au moins une lettre minuscule
                </p>
              </div>
              <Switch
                checked={settings.requireLowercase}
                onCheckedChange={(checked) =>
                  handleChange("requireLowercase", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chiffres obligatoires</Label>
                <p className="text-sm text-muted-foreground">
                  Au moins un chiffre
                </p>
              </div>
              <Switch
                checked={settings.requireNumbers}
                onCheckedChange={(checked) =>
                  handleChange("requireNumbers", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Caractères spéciaux</Label>
                <p className="text-sm text-muted-foreground">
                  Au moins un caractère spécial
                </p>
              </div>
              <Switch
                checked={settings.requireSpecialChars}
                onCheckedChange={(checked) =>
                  handleChange("requireSpecialChars", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sécurité réseau */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Sécurité Réseau</span>
          </CardTitle>
          <CardDescription>
            Protection contre les attaques réseau
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxRequestsPerMinute">
                Requêtes max par minute
              </Label>
              <Input
                id="maxRequestsPerMinute"
                type="number"
                value={settings.maxRequestsPerMinute}
                onChange={(e) =>
                  handleChange("maxRequestsPerMinute", parseInt(e.target.value))
                }
                min="10"
                max="1000"
              />
            </div>

            <div>
              <Label htmlFor="logRetentionDays">
                Rétention des logs (jours)
              </Label>
              <Input
                id="logRetentionDays"
                type="number"
                value={settings.logRetentionDays}
                onChange={(e) =>
                  handleChange("logRetentionDays", parseInt(e.target.value))
                }
                min="30"
                max="1095"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Limitation de débit</Label>
                <p className="text-sm text-muted-foreground">
                  Activer la limitation de débit (rate limiting)
                </p>
              </div>
              <Switch
                checked={settings.enableRateLimiting}
                onCheckedChange={(checked) =>
                  handleChange("enableRateLimiting", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>CORS</Label>
                <p className="text-sm text-muted-foreground">
                  Activer le partage de ressources cross-origin
                </p>
              </div>
              <Switch
                checked={settings.enableCORS}
                onCheckedChange={(checked) =>
                  handleChange("enableCORS", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Liste blanche IP</Label>
                <p className="text-sm text-muted-foreground">
                  Restreindre l'accès aux IPs autorisées
                </p>
              </div>
              <Switch
                checked={settings.enableIPWhitelist}
                onCheckedChange={(checked) =>
                  handleChange("enableIPWhitelist", checked)
                }
              />
            </div>
          </div>

          {settings.enableCORS && (
            <div>
              <Label>Origines autorisées</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.allowedOrigins.map((origin, index) => (
                  <Badge key={index} variant="secondary">
                    {origin}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protection contre les attaques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Protection contre les Attaques</span>
          </CardTitle>
          <CardDescription>Mesures de sécurité avancées</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Protection CSRF</Label>
                <p className="text-sm text-muted-foreground">
                  Protection contre les attaques CSRF
                </p>
              </div>
              <Switch
                checked={settings.enableCSRFProtection}
                onCheckedChange={(checked) =>
                  handleChange("enableCSRFProtection", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Protection XSS</Label>
                <p className="text-sm text-muted-foreground">
                  Protection contre les attaques XSS
                </p>
              </div>
              <Switch
                checked={settings.enableXSSProtection}
                onCheckedChange={(checked) =>
                  handleChange("enableXSSProtection", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Protection injection SQL</Label>
                <p className="text-sm text-muted-foreground">
                  Protection contre les injections SQL
                </p>
              </div>
              <Switch
                checked={settings.enableSQLInjectionProtection}
                onCheckedChange={(checked) =>
                  handleChange("enableSQLInjectionProtection", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Protection force brute</Label>
                <p className="text-sm text-muted-foreground">
                  Protection contre les attaques par force brute
                </p>
              </div>
              <Switch
                checked={settings.enableBruteForceProtection}
                onCheckedChange={(checked) =>
                  handleChange("enableBruteForceProtection", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit et logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Audit et Logs</span>
          </CardTitle>
          <CardDescription>Configuration des logs de sécurité</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Logs d'audit</Label>
              <p className="text-sm text-muted-foreground">
                Enregistrer toutes les actions d'administration
              </p>
            </div>
            <Switch
              checked={settings.enableAuditLogs}
              onCheckedChange={(checked) =>
                handleChange("enableAuditLogs", checked)
              }
            />
          </div>

          {settings.enableAuditLogs && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Logs d'audit actifs</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Toutes les actions d'administration sont enregistrées pour la
                sécurité
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
