"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TestTube,
  Settings,
} from "lucide-react";

interface ServiceConfigCardProps {
  title: string;
  description: string;
  status: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onTest: () => void;
}

export function ServiceConfigCard({
  title,
  description,
  status,
  enabled,
  onToggle,
  onTest,
}: ServiceConfigCardProps) {
  const t = useTranslations("admin.systemConfig");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "disconnected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case "disconnected":
        return <Badge className="bg-red-100 text-red-800">Disconnected</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={onToggle} />
            {getStatusBadge(status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={!enabled}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {t("testConnection")}
          </Button>

          <Button variant="outline" size="sm" disabled={!enabled}>
            <Settings className="h-4 w-4 mr-2" />
            {t("configure")}
          </Button>
        </div>

        {!enabled && (
          <p className="text-xs text-muted-foreground mt-2">
            {t("serviceDisabled")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
