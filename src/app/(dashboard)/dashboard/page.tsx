import { getSession } from "@/lib/session-helper";
import {
  Package,
  ShoppingBag,
  Truck,
  Users,
  Clock,
  CreditCard,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  const userRole = session?.user?.role || "CLIENT";
  const userName = session?.user?.name || "Utilisateur";

  // Afficher le tableau de bord en fonction du rôle de l'utilisateur
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Bonjour, {userName} 👋</h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre tableau de bord {getRoleLabel(userRole)}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/profile">
            Voir mon profil
          </Link>
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {getDashboardStats(userRole).map((stat, index) => (
          <Card 
            key={index} 
            className="overflow-hidden transition-all hover:shadow-md"
          >
            <div className="h-1" style={{ backgroundColor: stat.color }}></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className="rounded-full p-1.5" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-xl font-semibold mb-4 px-1">Actions rapides</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {getQuickActions(userRole).map((action, index) => (
            <Card key={index} className="overflow-hidden transition-all hover:shadow-md group">
              <Link href={action.href} className="block h-full">
                <div className="p-5 sm:p-6 flex items-start gap-4 h-full">
                  <div className={cn("p-2 rounded-full transition-colors group-hover:bg-opacity-80", action.bgColor)}>
                    <action.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", action.iconColor)} />
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* Dernières activités */}
      <div>
        <h2 className="text-xl font-semibold mb-4 px-1">Activités récentes</h2>
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg">Historique</CardTitle>
            <CardDescription>Vos dernières actions et notifications</CardDescription>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <div className="divide-y">
              {getRecentActivities(userRole).map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className={cn("p-2 mt-1 rounded-full flex-shrink-0", activity.bgColor)}>
                    <activity.icon className={cn("h-4 w-4", activity.iconColor)} />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">{activity.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Voir plus */}
      <div className="text-center pt-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/activities">
            Voir toutes les activités
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Fonctions utilitaires pour le tableau de bord

function getRoleLabel(role: string): string {
  switch (role) {
    case "CLIENT":
      return "client";
    case "MERCHANT":
      return "commerçant";
    case "COURIER":
      return "livreur";
    case "PROVIDER":
      return "prestataire";
    default:
      return "";
  }
}

function getDashboardStats(role: string) {
  switch (role) {
    case "CLIENT":
      return [
        {
          title: "Livraisons en cours",
          value: "3",
          description: "+10% depuis le mois dernier",
          icon: Package,
          color: "#4f46e5",
        },
        {
          title: "Crédits disponibles",
          value: "150",
          description: "Points de fidélité accumulés",
          icon: CreditCard,
          color: "#10b981",
        },
        {
          title: "Total des commandes",
          value: "28",
          description: "Depuis votre inscription",
          icon: ShoppingBag,
          color: "#f59e0b",
        },
        {
          title: "Économie réalisée",
          value: "72€",
          description: "Par rapport aux services traditionnels",
          icon: CreditCard,
          color: "#ef4444",
        },
      ];
    case "MERCHANT":
      return [
        {
          title: "Commandes en attente",
          value: "12",
          description: "+20% depuis hier",
          icon: Package,
          color: "#4f46e5",
        },
        {
          title: "Revenus du mois",
          value: "1,240€",
          description: "+15% par rapport au mois dernier",
          icon: CreditCard,
          color: "#10b981",
        },
        {
          title: "Clients actifs",
          value: "156",
          description: "+5 nouveaux cette semaine",
          icon: Users,
          color: "#f59e0b",
        },
        {
          title: "Livraisons en retard",
          value: "2",
          description: "À traiter en priorité",
          icon: AlertCircle,
          color: "#ef4444",
        },
      ];
    case "COURIER":
      return [
        {
          title: "Livraisons du jour",
          value: "8",
          description: "3 terminées, 5 à venir",
          icon: Package,
          color: "#4f46e5",
        },
        {
          title: "Revenus du jour",
          value: "75€",
          description: "Estimation basée sur les missions acceptées",
          icon: CreditCard,
          color: "#10b981",
        },
        {
          title: "Missions disponibles",
          value: "14",
          description: "Dans votre secteur",
          icon: MapPin,
          color: "#f59e0b",
        },
        {
          title: "Note moyenne",
          value: "4.8",
          description: "Basée sur 42 évaluations",
          icon: Users,
          color: "#ef4444",
        },
      ];
    case "PROVIDER":
      return [
        {
          title: "Services en cours",
          value: "5",
          description: "2 à traiter aujourd'hui",
          icon: Package,
          color: "#4f46e5",
        },
        {
          title: "Revenus du mois",
          value: "2,450€",
          description: "+8% par rapport au mois dernier",
          icon: CreditCard,
          color: "#10b981",
        },
        {
          title: "Demandes en attente",
          value: "7",
          description: "À confirmer ou refuser",
          icon: Clock,
          color: "#f59e0b",
        },
        {
          title: "Clients réguliers",
          value: "18",
          description: "Plus de 3 services réservés",
          icon: Users,
          color: "#ef4444",
        },
      ];
    default:
      return [];
  }
}

function getQuickActions(role: string) {
  switch (role) {
    case "CLIENT":
      return [
        {
          title: "Nouvelle livraison",
          description: "Créer une demande de livraison",
          icon: Package,
          href: "/dashboard/deliveries/new",
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Trouver un service",
          description: "Explorer les services disponibles",
          icon: Users,
          href: "/dashboard/services",
          bgColor: "bg-purple-100",
          iconColor: "text-purple-600",
        },
        {
          title: "Suivre mes colis",
          description: "Voir l'état de vos livraisons",
          icon: Truck,
          href: "/dashboard/deliveries",
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
      ];
    case "MERCHANT":
      return [
        {
          title: "Nouvelle expédition",
          description: "Créer une nouvelle expédition",
          icon: Package,
          href: "/dashboard/shipments/new",
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Gérer les commandes",
          description: "Voir et gérer vos commandes",
          icon: ShoppingBag,
          href: "/dashboard/orders",
          bgColor: "bg-amber-100",
          iconColor: "text-amber-600",
        },
        {
          title: "Analyser les ventes",
          description: "Consulter vos statistiques",
          icon: CreditCard,
          href: "/dashboard/analytics",
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
      ];
    case "COURIER":
      return [
        {
          title: "Missions disponibles",
          description: "Trouver des livraisons à effectuer",
          icon: MapPin,
          href: "/dashboard/missions",
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Mes livraisons",
          description: "Gérer vos livraisons en cours",
          icon: Truck,
          href: "/dashboard/deliveries",
          bgColor: "bg-amber-100",
          iconColor: "text-amber-600",
        },
        {
          title: "Mon planning",
          description: "Consulter votre agenda",
          icon: Clock,
          href: "/dashboard/schedule",
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
      ];
    case "PROVIDER":
      return [
        {
          title: "Nouvelles demandes",
          description: "Voir les demandes de service",
          icon: AlertCircle,
          href: "/dashboard/requests",
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Services en cours",
          description: "Gérer vos services actifs",
          icon: Users,
          href: "/dashboard/services",
          bgColor: "bg-amber-100",
          iconColor: "text-amber-600",
        },
        {
          title: "Mon planning",
          description: "Gérer votre disponibilité",
          icon: Clock,
          href: "/dashboard/schedule",
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
      ];
    default:
      return [];
  }
}

function getRecentActivities(role: string) {
  switch (role) {
    case "CLIENT":
      return [
        {
          title: "Livraison confirmée",
          description: "Votre colis #ECD-3872 a été pris en charge",
          time: "Il y a 2h",
          icon: Package,
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
        {
          title: "Paiement effectué",
          description: "Paiement de 24,99€ pour la livraison #ECD-3872",
          time: "Il y a 5h",
          icon: CreditCard,
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Nouvelle offre",
          description: "25% de réduction sur votre prochaine livraison",
          time: "Hier",
          icon: ShoppingBag,
          bgColor: "bg-amber-100",
          iconColor: "text-amber-600",
        },
      ];
    case "MERCHANT":
      return [
        {
          title: "Nouvelle commande",
          description: "Commande #ORD-721 reçue de Jean Dupont",
          time: "Il y a 30min",
          icon: ShoppingBag,
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
        {
          title: "Livraison en cours",
          description: "Commande #ORD-698 en cours de livraison",
          time: "Il y a 3h",
          icon: Truck,
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Paiement reçu",
          description: "Paiement de 89,95€ reçu pour la commande #ORD-712",
          time: "Hier",
          icon: CreditCard,
          bgColor: "bg-purple-100",
          iconColor: "text-purple-600",
        },
      ];
    case "COURIER":
      return [
        {
          title: "Nouvelle mission",
          description: "Mission de livraison #DEL-567 assignée",
          time: "Il y a 1h",
          icon: Package,
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
        {
          title: "Livraison terminée",
          description: "Livraison #DEL-554 confirmée par le client",
          time: "Il y a 4h",
          icon: Truck,
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Paiement reçu",
          description: "Rémunération de 18,50€ pour la mission #DEL-542",
          time: "Hier",
          icon: CreditCard,
          bgColor: "bg-purple-100",
          iconColor: "text-purple-600",
        },
      ];
    case "PROVIDER":
      return [
        {
          title: "Nouvelle demande",
          description: "Demande de service #SRV-231 reçue de Marie Martin",
          time: "Il y a 45min",
          icon: Users,
          bgColor: "bg-green-100",
          iconColor: "text-green-600",
        },
        {
          title: "Service complété",
          description: "Service #SRV-212 marqué comme terminé",
          time: "Il y a 6h",
          icon: Package,
          bgColor: "bg-blue-100",
          iconColor: "text-blue-600",
        },
        {
          title: "Évaluation reçue",
          description: "5 étoiles reçues pour le service #SRV-198",
          time: "Hier",
          icon: Users,
          bgColor: "bg-amber-100",
          iconColor: "text-amber-600",
        },
      ];
    default:
      return [];
  }
} 