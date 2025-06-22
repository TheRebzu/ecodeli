"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ApiTestWidget } from "@/components/client/test/api-test-widget";
import { InfoIcon, ExternalLink, Code, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ClientTestPage() {
  const { data: session } = useSession();

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* En-tête */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Code className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Test des API Client</h1>
          <Badge variant="secondary">Mode Développement</Badge>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Cette page permet de tester toutes les fonctionnalités client de l'API EcoDeli 
          et de vérifier l'intégration des hooks tRPC.
        </p>
      </div>

      {/* Info utilisateur */}
      {session?.user && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Utilisateur connecté</AlertTitle>
          <AlertDescription>
            Connecté en tant que <strong>{session.user.name}</strong> ({session.user.email}) - Rôle: <Badge variant="outline">{session.user.role}</Badge>
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Widget de test principal */}
      <div className="flex justify-center">
        <ApiTestWidget />
      </div>

      <Separator />

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Créer une annonce
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Tester le formulaire complet de création d'annonce
            </p>
            <Button asChild className="w-full">
              <Link href="/client/announcements/create">
                Créer une annonce
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Dashboard principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Voir le dashboard client avec toutes les statistiques
            </p>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/client">
                Voir le dashboard
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Rechercher et réserver des services
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/client/services">
                Voir les services
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Informations techniques */}
      <Card>
        <CardHeader>
          <CardTitle>Informations techniques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">API testées :</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• client.getProfile</li>
                <li>• clientData.getDashboardStats</li>
                <li>• clientAnnouncements.getMyAnnouncements</li>
                <li>• clientAnnouncements.createAnnouncement</li>
                <li>• clientServices.searchServices</li>
                <li>• clientPayments.getPaymentHistory</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Hooks utilisés :</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• useAnnouncements</li>
                <li>• useClientDashboard</li>
                <li>• useServiceBooking</li>
                <li>• usePayment</li>
                <li>• api.client.getProfile.useQuery</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interface de test complète */}
      <Card>
        <CardHeader>
          <CardTitle>Interface de test complète</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Accédez à l'interface de test automatisée complète qui teste toutes les fonctionnalités de Mission 1
          </p>
          <Button asChild variant="default" size="lg">
            <Link href="/mission1-test.html" target="_blank">
              Ouvrir l'interface de test Mission 1
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}