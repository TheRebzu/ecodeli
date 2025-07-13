"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Cloud,
  Webhook,
  Key,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { SystemConfigDashboard } from "@/features/admin/components/system-config/system-config-dashboard";
import { ServiceConfigCard } from "@/features/admin/components/system-config/service-config-card";
import { WebhookManager } from "@/features/admin/components/system-config/webhook-manager";

export default function AdminSystemConfigPage() {
  const t = useTranslations("admin.systemConfig");
  const [activeTab, setActiveTab] = useState("overview");
  const [config, setConfig] = useState({
    oneSignal: {
      appId: "",
      apiKey: "",
      enabled: true,
      status: "connected",
    },
    stripe: {
      publishableKey: "",
      secretKey: "",
      webhookSecret: "",
      enabled: true,
      status: "connected",
    },
    email: {
      provider: "sendgrid",
      apiKey: "",
      fromEmail: "",
      enabled: true,
      status: "connected",
    },
    storage: {
      provider: "aws",
      bucket: "",
      region: "",
      accessKey: "",
      secretKey: "",
      enabled: true,
      status: "connected",
    },
  });

  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/admin/system-config");
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error("Error fetching system config:", error);
      }
    };

    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    try {
      const response = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        // Show success message
        console.log("Configuration saved successfully");
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
    }
  };

  const testService = async (serviceName: string) => {
    try {
      const response = await fetch(
        `/api/admin/system-config/test/${serviceName}`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        // Update status
        setConfig((prev) => ({
          ...prev,
          [serviceName]: {
            ...prev[serviceName as keyof typeof prev],
            status: "connected",
          },
        }));
      }
    } catch (error) {
      console.error(`Error testing ${serviceName}:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSecrets(!showSecrets)}
          >
            {showSecrets ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showSecrets ? t("hideSecrets") : t("showSecrets")}
          </Button>
          <Button size="sm" onClick={handleSaveConfig}>
            <Save className="h-4 w-4 mr-2" />
            {t("saveConfig")}
          </Button>
        </div>
      </div>

      {/* Dashboard Overview */}
      <SystemConfigDashboard config={config} />

      {/* Configuration Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("overview")}
          </TabsTrigger>
          <TabsTrigger
            value="cloud-services"
            className="flex items-center gap-2"
          >
            <Cloud className="h-4 w-4" />
            {t("cloudServices")}
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            {t("webhooks")}
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            {t("apiKeys")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{t("overview.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ServiceConfigCard
                  title="OneSignal"
                  description={t("oneSignal.description")}
                  status={config.oneSignal.status}
                  enabled={config.oneSignal.enabled}
                  onToggle={(enabled) =>
                    setConfig((prev) => ({
                      ...prev,
                      oneSignal: { ...prev.oneSignal, enabled },
                    }))
                  }
                  onTest={() => testService("oneSignal")}
                />

                <ServiceConfigCard
                  title="Stripe"
                  description={t("stripe.description")}
                  status={config.stripe.status}
                  enabled={config.stripe.enabled}
                  onToggle={(enabled) =>
                    setConfig((prev) => ({
                      ...prev,
                      stripe: { ...prev.stripe, enabled },
                    }))
                  }
                  onTest={() => testService("stripe")}
                />

                <ServiceConfigCard
                  title="Email Service"
                  description={t("email.description")}
                  status={config.email.status}
                  enabled={config.email.enabled}
                  onToggle={(enabled) =>
                    setConfig((prev) => ({
                      ...prev,
                      email: { ...prev.email, enabled },
                    }))
                  }
                  onTest={() => testService("email")}
                />

                <ServiceConfigCard
                  title="Storage"
                  description={t("storage.description")}
                  status={config.storage.status}
                  enabled={config.storage.enabled}
                  onToggle={(enabled) =>
                    setConfig((prev) => ({
                      ...prev,
                      storage: { ...prev.storage, enabled },
                    }))
                  }
                  onTest={() => testService("storage")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloud-services">
          <Card>
            <CardHeader>
              <CardTitle>{t("cloudServices.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OneSignal Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">OneSignal</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("oneSignal.description")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.oneSignal.enabled}
                      onCheckedChange={(enabled) =>
                        setConfig((prev) => ({
                          ...prev,
                          oneSignal: { ...prev.oneSignal, enabled },
                        }))
                      }
                    />
                    <Badge
                      variant={
                        config.oneSignal.status === "connected"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {config.oneSignal.status === "connected" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {config.oneSignal.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="onesignal-app-id">
                      {t("oneSignal.appId")}
                    </Label>
                    <Input
                      id="onesignal-app-id"
                      type={showSecrets ? "text" : "password"}
                      value={config.oneSignal.appId}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          oneSignal: {
                            ...prev.oneSignal,
                            appId: e.target.value,
                          },
                        }))
                      }
                      placeholder="Your OneSignal App ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="onesignal-api-key">
                      {t("oneSignal.apiKey")}
                    </Label>
                    <Input
                      id="onesignal-api-key"
                      type={showSecrets ? "text" : "password"}
                      value={config.oneSignal.apiKey}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          oneSignal: {
                            ...prev.oneSignal,
                            apiKey: e.target.value,
                          },
                        }))
                      }
                      placeholder="Your OneSignal API Key"
                    />
                  </div>
                </div>
              </div>

              {/* Stripe Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Stripe</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("stripe.description")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.stripe.enabled}
                      onCheckedChange={(enabled) =>
                        setConfig((prev) => ({
                          ...prev,
                          stripe: { ...prev.stripe, enabled },
                        }))
                      }
                    />
                    <Badge
                      variant={
                        config.stripe.status === "connected"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {config.stripe.status === "connected" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {config.stripe.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stripe-publishable-key">
                      {t("stripe.publishableKey")}
                    </Label>
                    <Input
                      id="stripe-publishable-key"
                      type={showSecrets ? "text" : "password"}
                      value={config.stripe.publishableKey}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          stripe: {
                            ...prev.stripe,
                            publishableKey: e.target.value,
                          },
                        }))
                      }
                      placeholder="pk_test_..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="stripe-secret-key">
                      {t("stripe.secretKey")}
                    </Label>
                    <Input
                      id="stripe-secret-key"
                      type={showSecrets ? "text" : "password"}
                      value={config.stripe.secretKey}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          stripe: { ...prev.stripe, secretKey: e.target.value },
                        }))
                      }
                      placeholder="sk_test_..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookManager />
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>{t("apiKeys.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="api-key-name">{t("apiKeys.name")}</Label>
                  <Input id="api-key-name" placeholder="My API Key" />
                </div>
                <div>
                  <Label htmlFor="api-key-permissions">
                    {t("apiKeys.permissions")}
                  </Label>
                  <Textarea
                    id="api-key-permissions"
                    placeholder="Select permissions..."
                    rows={3}
                  />
                </div>
                <Button>
                  <Key className="h-4 w-4 mr-2" />
                  {t("apiKeys.generate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
