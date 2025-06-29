"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ManualBillingTrigger() {
  const t = useTranslations("admin.billing");
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<string | null>(null);

  const triggerBilling = async () => {
    setIsExecuting(true);
    try {
      const response = await fetch('/api/admin/billing/trigger-monthly', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "✅ Facturation déclenchée",
          description: "La facturation mensuelle a été exécutée avec succès"
        });
        setLastExecution(new Date().toISOString());
      } else {
        throw new Error(data.error || 'Erreur lors du déclenchement');
      }
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du déclenchement",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Facturation mensuelle des prestataires
        </CardTitle>
        <CardDescription>
          Déclencher manuellement le processus de facturation mensuelle pour tous les prestataires actifs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Cette action va générer les factures mensuelles pour tous les prestataires ayant des interventions complétées ce mois-ci.
            Les virements seront simulés et les notifications envoyées.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Exécution automatique</p>
              <p className="text-sm text-gray-600">Chaque 30 du mois à 00:00</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Planifiée</span>
            </div>
          </div>

          {lastExecution && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
              <div>
                <p className="font-medium">Dernière exécution manuelle</p>
                <p className="text-sm text-gray-600">{formatDate(lastExecution)}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          )}

          <Button
            onClick={triggerBilling}
            disabled={isExecuting}
            className="w-full"
            size="lg"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exécution en cours...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Déclencher la facturation maintenant
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Les prestataires recevront une notification avec leur facture</p>
          <p>• Les virements bancaires seront simulés (délai de 24h)</p>
          <p>• Les factures PDF seront générées automatiquement</p>
          <p>• Un rapport sera envoyé aux administrateurs</p>
        </div>
      </CardContent>
    </Card>
  );
}