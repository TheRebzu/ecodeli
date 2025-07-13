"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShoppingCart,
  Package,
  CreditCard,
  FileText,
  TrendingUp,
  TrendingDown,
  Euro,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  BarChart3,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { useMerchantDashboard } from "@/features/merchant/hooks/use-merchant-dashboard";
import { useTranslations } from "next-intl";

interface QuickAction {
  label: string;
  href: string;
  icon: any;
  description: string;
  count?: number;
}

export default function MerchantDashboard() {
  const t = useTranslations("merchant.dashboard");
  const { data, loading, error, refreshData } = useMerchantDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>Aucune donnée disponible</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { merchant, stats, recentOrders } = data;

  // Actions rapides selon les exigences du cahier des charges
  const quickActions: QuickAction[] = [
    {
      label: "Créer une annonce",
      href: "/merchant/announcements/create",
      icon: Package,
      description: "Publier un nouveau produit ou service",
      count: stats.activeAnnouncements,
    },
    {
      label: "Configurer lâcher de chariot",
      href: "/merchant/cart-drop/settings",
      icon: ShoppingCart,
      description: "Service phare EcoDeli - Configuration",
      count: stats.cartDropOrders,
    },
    {
      label: "Consulter contrat",
      href: "/merchant/contracts",
      icon: FileText,
      description: "Gestion de votre contrat avec EcoDeli",
    },
    {
      label: "Facturer services",
      href: "/merchant/billing/create",
      icon: CreditCard,
      description: "Créer une facture pour vos services",
    },
    {
      label: "Demander virement",
      href: "/merchant/payments",
      icon: Euro,
      description: "Accès à vos paiements et virements",
    },
    {
      label: "Analytics business",
      href: "/merchant/analytics",
      icon: BarChart3,
      description: "Analyser vos performances",
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: {
        variant: "secondary" as const,
        text: "En attente",
        icon: Clock,
      },
      CONFIRMED: {
        variant: "outline" as const,
        text: "Confirmée",
        icon: CheckCircle,
      },
      DELIVERED: {
        variant: "default" as const,
        text: "Livrée",
        icon: CheckCircle,
      },
      CANCELLED: {
        variant: "destructive" as const,
        text: "Annulée",
        icon: AlertCircle,
      },
    };
    return variants[status as keyof typeof variants] || variants.PENDING;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      CART_DROP: "Lâcher de chariot",
      PACKAGE_DELIVERY: "Livraison colis",
      INTERNATIONAL_PURCHASE: "Achat international",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getContractStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: { variant: "default" as const, text: "Actif" },
      PENDING: { variant: "secondary" as const, text: "En attente" },
      EXPIRED: { variant: "destructive" as const, text: "Expiré" },
    };
    return variants[status as keyof typeof variants] || variants.PENDING;
  };

  return (
    <div className="space-y-6">
      {/* En-tête de bienvenue */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Commerçant</h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre espace EcoDeli - Gérez vos activités de
            crowdshipping
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={getContractStatusBadge(merchant.contractStatus).variant}
          >
            Contrat {getContractStatusBadge(merchant.contractStatus).text}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Indicateurs clés selon le cahier des charges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Chiffre d'affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRevenue.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {stats.revenueGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(stats.revenueGrowth)}% ce mois
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Commandes totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />+
              {stats.ordersGrowth}% ce mois
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Paiements en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingPayments.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              À recevoir prochainement
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Lâcher de chariot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.cartDropOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Service phare EcoDeli
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions rapides conformes au cahier des charges */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
              <CardDescription>
                Accès direct aux fonctionnalités principales selon vos besoins
                EcoDeli
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <action.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">
                            {action.label}
                          </h3>
                          {action.count && (
                            <Badge variant="secondary" className="text-xs">
                              {action.count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Commandes récentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Commandes Récentes</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/merchant/cart-drop/orders">
                    <Eye className="h-4 w-4 mr-2" />
                    Voir tout
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {order.client?.profile
                            ? `${order.client.profile.firstName || ""} ${order.client.profile.lastName || ""}`.trim()
                            : "Client"}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {order.orderNumber}
                        </Badge>
                        <Badge
                          variant={getStatusBadge(order.status).variant}
                          className="text-xs"
                        >
                          {getStatusBadge(order.status).text}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Commande #{order.orderNumber}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{order.totalAmount.toFixed(2)}€</span>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-6">
          {/* État du contrat */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">État du Contrat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge
                  variant={
                    getContractStatusBadge(merchant.contractStatus).variant
                  }
                >
                  {getContractStatusBadge(merchant.contractStatus).text}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium">Premium</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Commission
                </span>
                <span className="text-sm font-medium">8,5%</span>
              </div>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/merchant/contracts">
                  <FileText className="h-4 w-4 mr-2" />
                  Voir les détails
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Performances du mois */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance ce Mois</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Lâcher de chariot</span>
                  <span className="text-sm font-medium">55%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full w-[55%]"></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Livraisons</span>
                  <span className="text-sm font-medium">30%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full w-[30%]"></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">International</span>
                  <span className="text-sm font-medium">15%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full w-[15%]"></div>
                </div>
              </div>

              <Button className="w-full" variant="outline" asChild>
                <Link href="/merchant/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics détaillés
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Agenda / Planning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planning à venir</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Collecte produits bio</p>
                  <p className="text-xs text-muted-foreground">Demain 14h30</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Livraison zone sud</p>
                  <p className="text-xs text-muted-foreground">
                    Vendredi matin
                  </p>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline" asChild>
                <Link href="/merchant/cart-drop/orders">
                  <Clock className="h-4 w-4 mr-2" />
                  Voir planning complet
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
