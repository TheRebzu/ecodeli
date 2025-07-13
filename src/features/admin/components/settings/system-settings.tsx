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
  Database,
  HardDrive,
  Settings,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface SystemSettingsProps {
  onSettingsChange: () => void;
}

export function SystemSettings({ onSettingsChange }: SystemSettingsProps) {
  const [settings, setSettings] = useState({
    // Configuration base de données
    database: {
      maxConnections: 20,
      enableLogging: true,
      enableQueryCache: true,
    },

    // Configuration cache
    cache: {
      enabled: true,
      provider: "redis",
      ttl: 3600,
    },

    // Configuration serveur
    server: {
      port: 3000,
      enableCORS: true,
      enableCompression: true,
    },

    // Configuration maintenance
    maintenance: {
      enabled: false,
      message: "Site en maintenance. Merci de votre patience.",
    },

    // Configuration logs
    logs: {
      level: "info",
      enableAuditLogs: true,
    },

    // Configuration backup
    backup: {
      enabled: true,
      frequency: "daily",
      retention: 30,
    },
  });

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    onSettingsChange();
  };

  const handleNestedChange = (
    parentKey: string,
    childKey: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey as keyof typeof prev],
        [childKey]: value,
      },
    }));
    onSettingsChange();
  };

  return (
    <div className="space-y-6">
      {/* Configuration base de données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Configuration Base de Données</span>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connectée
            </Badge>
          </CardTitle>
          <CardDescription>
            Paramètres de connexion et performance de la base de données
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maxConnections">Connexions max</Label>
            <Input
              id="maxConnections"
              type="number"
              value={settings.database.maxConnections}
              onChange={(e) =>
                handleNestedChange(
                  "database",
                  "maxConnections",
                  parseInt(e.target.value),
                )
              }
              min="5"
              max="100"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Logs de base de données</Label>
                <p className="text-sm text-muted-foreground">
                  Activer les logs des requêtes
                </p>
              </div>
              <Switch
                checked={settings.database.enableLogging}
                onCheckedChange={(checked) =>
                  handleNestedChange("database", "enableLogging", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cache des requêtes</Label>
                <p className="text-sm text-muted-foreground">
                  Mettre en cache les requêtes fréquentes
                </p>
              </div>
              <Switch
                checked={settings.database.enableQueryCache}
                onCheckedChange={(checked) =>
                  handleNestedChange("database", "enableQueryCache", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>Configuration Cache</span>
            {settings.cache.enabled && (
              <Badge className="bg-blue-100 text-blue-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Configuration du système de cache</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer le cache</Label>
              <p className="text-sm text-muted-foreground">
                Activer le système de cache
              </p>
            </div>
            <Switch
              checked={settings.cache.enabled}
              onCheckedChange={(checked) =>
                handleNestedChange("cache", "enabled", checked)
              }
            />
          </div>

          {settings.cache.enabled && (
            <>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cacheProvider">Fournisseur de cache</Label>
                  <Select
                    value={settings.cache.provider}
                    onValueChange={(value) =>
                      handleNestedChange("cache", "provider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="redis">Redis</SelectItem>
                      <SelectItem value="memory">Mémoire</SelectItem>
                      <SelectItem value="file">Fichier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cacheTTL">TTL (secondes)</Label>
                  <Input
                    id="cacheTTL"
                    type="number"
                    value={settings.cache.ttl}
                    onChange={(e) =>
                      handleNestedChange(
                        "cache",
                        "ttl",
                        parseInt(e.target.value),
                      )
                    }
                    min="60"
                    max="86400"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Vider le cache
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Configuration serveur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuration Serveur</span>
          </CardTitle>
          <CardDescription>Paramètres du serveur web</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="serverPort">Port</Label>
            <Input
              id="serverPort"
              type="number"
              value={settings.server.port}
              onChange={(e) =>
                handleNestedChange("server", "port", parseInt(e.target.value))
              }
              min="1024"
              max="65535"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>CORS</Label>
                <p className="text-sm text-muted-foreground">
                  Activer le partage de ressources cross-origin
                </p>
              </div>
              <Switch
                checked={settings.server.enableCORS}
                onCheckedChange={(checked) =>
                  handleNestedChange("server", "enableCORS", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compression</Label>
                <p className="text-sm text-muted-foreground">
                  Compresser les réponses HTTP
                </p>
              </div>
              <Switch
                checked={settings.server.enableCompression}
                onCheckedChange={(checked) =>
                  handleNestedChange("server", "enableCompression", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Mode Maintenance</span>
            {settings.maintenance.enabled && (
              <Badge className="bg-orange-100 text-orange-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Configuration du mode maintenance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer la maintenance</Label>
              <p className="text-sm text-muted-foreground">
                Mettre le site en mode maintenance
              </p>
            </div>
            <Switch
              checked={settings.maintenance.enabled}
              onCheckedChange={(checked) =>
                handleNestedChange("maintenance", "enabled", checked)
              }
            />
          </div>

          {settings.maintenance.enabled && (
            <>
              <Separator />

              <div>
                <Label htmlFor="maintenanceMessage">
                  Message de maintenance
                </Label>
                <Input
                  id="maintenanceMessage"
                  value={settings.maintenance.message}
                  onChange={(e) =>
                    handleNestedChange("maintenance", "message", e.target.value)
                  }
                  placeholder="Message affiché aux utilisateurs"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Configuration logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Configuration Logs</span>
          </CardTitle>
          <CardDescription>Paramètres des logs système</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logLevel">Niveau de log</Label>
            <Select
              value={settings.logs.level}
              onValueChange={(value) =>
                handleNestedChange("logs", "level", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Logs d'audit</Label>
              <p className="text-sm text-muted-foreground">
                Enregistrer les actions d'administration
              </p>
            </div>
            <Switch
              checked={settings.logs.enableAuditLogs}
              onCheckedChange={(checked) =>
                handleNestedChange("logs", "enableAuditLogs", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Sauvegarde</span>
            {settings.backup.enabled && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configuration des sauvegardes automatiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sauvegardes automatiques</Label>
              <p className="text-sm text-muted-foreground">
                Activer les sauvegardes automatiques
              </p>
            </div>
            <Switch
              checked={settings.backup.enabled}
              onCheckedChange={(checked) =>
                handleNestedChange("backup", "enabled", checked)
              }
            />
          </div>

          {settings.backup.enabled && (
            <>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="backupFrequency">Fréquence</Label>
                  <Select
                    value={settings.backup.frequency}
                    onValueChange={(value) =>
                      handleNestedChange("backup", "frequency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Toutes les heures</SelectItem>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="backupRetention">Rétention (jours)</Label>
                  <Input
                    id="backupRetention"
                    type="number"
                    value={settings.backup.retention}
                    onChange={(e) =>
                      handleNestedChange(
                        "backup",
                        "retention",
                        parseInt(e.target.value),
                      )
                    }
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Sauvegarde manuelle
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
