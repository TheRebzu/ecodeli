import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, FileText, Settings, ShieldAlert, Users, Boxes, PieChart, Truck, CreditCard } from "lucide-react";

export default async function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Administration Centrale</h1>
        <p className="text-muted-foreground">
          Gestion centralisée de la plateforme EcoDeli
        </p>
      </div>
      
      <Alert variant="destructive" className="max-w-4xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Alerte critique</AlertTitle>
        <AlertDescription>
          3 rapports d'erreurs système détectés aujourd'hui. Une révision est nécessaire.
        </AlertDescription>
        <Button variant="destructive" size="sm" className="mt-2" asChild>
          <Link href="/admin/alerts">
            Voir les alertes
          </Link>
        </Button>
      </Alert>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Gestion des utilisateurs</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Administrer les comptes, les rôles et les permissions des utilisateurs de la plateforme.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/admin/users">
                Accéder
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Suivi des livraisons</CardTitle>
            <Truck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Surveiller et gérer l'ensemble des livraisons et opérations logistiques.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/admin/shipments">
                Accéder
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Gestion financière</CardTitle>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Administrer les paiements, les remboursements et les transactions financières.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/admin/finances">
                Accéder
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Analytiques</CardTitle>
            <PieChart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Visualiser et analyser les données de performance et tendances de la plateforme.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/admin/analytics">
                Accéder
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Inventaire</CardTitle>
            <Boxes className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Gérer les produits, les stocks et les entrepôts dans l'ensemble du système.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/admin/storage">
                Accéder
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Sécurité & Audits</CardTitle>
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Surveiller les activités, auditer les journaux et gérer les accès au système.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/admin/security">
                Accéder
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Configuration système</CardTitle>
            <CardDescription>Paramètres généraux de la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center mb-4">
              <Settings className="h-5 w-5 mr-2 text-muted-foreground" />
              <p className="text-sm">Gérer les paramètres globaux, les intégrations et les préférences système.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/admin/settings">
                Configurer
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Guides et procédures d'administration</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
              <p className="text-sm">Consulter les guides d'administration, les procédures et les protocoles.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/documentation">
                Consulter
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="text-xs text-muted-foreground border-t pt-4 mt-10">
        <p>Accès réservé aux administrateurs système. Toutes les actions sont journalisées.</p>
        <p>Pour accéder à votre espace personnel, visitez le <Link href="/dashboard?role=admin" className="text-primary underline">tableau de bord personnel</Link>.</p>
      </div>
    </div>
  );
} 