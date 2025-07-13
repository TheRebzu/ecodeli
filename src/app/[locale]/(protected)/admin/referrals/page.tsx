import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Gift,
  TrendingUp,
  Star,
  DollarSign,
  Calendar,
  Share2,
  Crown,
  Target,
  Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Gestion du Parrainage - EcoDeli",
  description: "Gestion des programmes de parrainage et d'influence",
};

// Données fictives pour la démonstration
const referralStats = {
  totalReferrals: 1247,
  activePrograms: 5,
  totalRewards: 15680,
  conversionRate: 0.23,
  topReferrers: 24,
  monthlyGrowth: 0.18,
  influencers: 8,
  campaignsActive: 3,
};

const activePrograms = [
  {
    id: "1",
    name: "Parrainage Utilisateurs",
    type: "USER_REFERRAL",
    isActive: true,
    totalReferrals: 456,
    successfulReferrals: 289,
    conversionRate: 0.63,
    referrerReward: { type: "CASH", amount: 10 },
    refereeReward: { type: "CREDIT", amount: 15 },
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Parrainage Livreurs",
    type: "DELIVERER_REFERRAL",
    isActive: true,
    totalReferrals: 89,
    successfulReferrals: 67,
    conversionRate: 0.75,
    referrerReward: { type: "CASH", amount: 25 },
    refereeReward: { type: "CASH", amount: 20 },
    createdAt: "2024-02-01",
  },
  {
    id: "3",
    name: "Parrainage Prestataires",
    type: "PROVIDER_REFERRAL",
    isActive: true,
    totalReferrals: 34,
    successfulReferrals: 28,
    conversionRate: 0.82,
    referrerReward: { type: "CASH", amount: 50 },
    refereeReward: { type: "CASH", amount: 30 },
    createdAt: "2024-03-01",
  },
];

const topReferrers = [
  {
    id: "1",
    name: "Marie Dubois",
    role: "CLIENT",
    totalReferrals: 23,
    successfulReferrals: 18,
    totalRewards: 180,
    lastReferral: "2024-12-18",
    level: "Gold",
  },
  {
    id: "2",
    name: "Pierre Martin",
    role: "DELIVERER",
    totalReferrals: 19,
    successfulReferrals: 16,
    totalRewards: 400,
    lastReferral: "2024-12-20",
    level: "Gold",
  },
  {
    id: "3",
    name: "Sophie Laurent",
    role: "PROVIDER",
    totalReferrals: 15,
    successfulReferrals: 13,
    totalRewards: 650,
    lastReferral: "2024-12-15",
    level: "Silver",
  },
];

const influencerPrograms = [
  {
    id: "1",
    influencerName: "Emma Lifestyle",
    programName: "Collaboration EcoDeli",
    status: "ACTIVE",
    followers: 125000,
    platform: "Instagram",
    commissionRate: 8,
    totalClicks: 2456,
    conversions: 89,
    totalEarnings: 1230,
    conversionRate: 0.036,
  },
  {
    id: "2",
    influencerName: "Green Living TV",
    programName: "Partenariat Écologique",
    status: "ACTIVE",
    followers: 89000,
    platform: "YouTube",
    commissionRate: 12,
    totalClicks: 1823,
    conversions: 67,
    totalEarnings: 890,
    conversionRate: 0.037,
  },
  {
    id: "3",
    influencerName: "EcoFriendly Tips",
    programName: "Promotion Services",
    status: "PENDING",
    followers: 67000,
    platform: "TikTok",
    commissionRate: 10,
    totalClicks: 0,
    conversions: 0,
    totalEarnings: 0,
    conversionRate: 0,
  },
];

const getStatusBadge = (status: string) => {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    ACTIVE: "default",
    PENDING: "secondary",
    APPROVED: "default",
    REJECTED: "destructive",
    SUSPENDED: "outline",
  };

  const labels: Record<string, string> = {
    ACTIVE: "Actif",
    PENDING: "En attente",
    APPROVED: "Approuvé",
    REJECTED: "Rejeté",
    SUSPENDED: "Suspendu",
  };

  return (
    <Badge variant={variants[status] || "outline"}>
      {labels[status] || status}
    </Badge>
  );
};

const getLevelBadge = (level: string) => {
  const colors: Record<string, string> = {
    Bronze: "bg-orange-100 text-orange-800",
    Silver: "bg-gray-100 text-gray-800",
    Gold: "bg-yellow-100 text-yellow-800",
    Platinum: "bg-purple-100 text-purple-800",
  };

  return (
    <Badge className={colors[level] || "bg-gray-100 text-gray-800"}>
      <Crown className="w-3 h-3 mr-1" />
      {level}
    </Badge>
  );
};

export default function AdminReferralsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion du Parrainage</h1>
          <p className="text-muted-foreground">
            Gérez les programmes de parrainage et les partenariats influenceurs
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button>
            <Gift className="mr-2 h-4 w-4" />
            Nouveau Programme
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Parrainages
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralStats.totalReferrals}
            </div>
            <p className="text-xs text-green-600">
              +{(referralStats.monthlyGrowth * 100).toFixed(0)}% ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux de Conversion
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(referralStats.conversionRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Parrainages réussis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Récompenses Versées
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralStats.totalRewards}€
            </div>
            <p className="text-xs text-muted-foreground">Ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Influenceurs Actifs
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralStats.influencers}
            </div>
            <p className="text-xs text-muted-foreground">
              {referralStats.campaignsActive} campagnes actives
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="programs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="programs">Programmes</TabsTrigger>
          <TabsTrigger value="referrers">Top Parrains</TabsTrigger>
          <TabsTrigger value="influencers">Influenceurs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Programmes de Parrainage</CardTitle>
              <CardDescription>
                Gestion des programmes de parrainage actifs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePrograms.map((program) => (
                  <div
                    key={program.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{program.name}</h3>
                        {getStatusBadge(
                          program.isActive ? "ACTIVE" : "INACTIVE",
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {program.successfulReferrals}/{program.totalReferrals}{" "}
                        réussis • Taux:{" "}
                        {(program.conversionRate * 100).toFixed(0)}%
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Parrain: {program.referrerReward.amount}€</span>
                        <span>Filleul: {program.refereeReward.amount}€</span>
                        <span>
                          Créé le{" "}
                          {new Date(program.createdAt).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Modifier
                      </Button>
                      <Button size="sm" variant="outline">
                        Statistiques
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Parrains</CardTitle>
              <CardDescription>
                Les utilisateurs les plus actifs en parrainage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topReferrers.map((referrer, index) => (
                  <div
                    key={referrer.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{referrer.name}</h3>
                          {getLevelBadge(referrer.level)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {referrer.role} • {referrer.successfulReferrals}/
                          {referrer.totalReferrals} réussis
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dernier parrainage:{" "}
                          {new Date(referrer.lastReferral).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {referrer.totalRewards}€
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Récompenses
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        Profil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="influencers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Programmes Influenceurs</CardTitle>
              <CardDescription>
                Gestion des partenariats avec les influenceurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {influencerPrograms.map((influencer) => (
                  <div
                    key={influencer.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {influencer.influencerName}
                        </h3>
                        {getStatusBadge(influencer.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {influencer.programName} • {influencer.platform}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {(influencer.followers / 1000).toFixed(0)}k followers
                        </span>
                        <span>Commission: {influencer.commissionRate}%</span>
                        <span>
                          Conversion:{" "}
                          {(influencer.conversionRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex gap-4 text-sm">
                        <div>
                          <p className="font-medium">
                            {influencer.totalClicks}
                          </p>
                          <p className="text-xs text-muted-foreground">Clics</p>
                        </div>
                        <div>
                          <p className="font-medium">
                            {influencer.conversions}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Conversions
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-green-600">
                            {influencer.totalEarnings}€
                          </p>
                          <p className="text-xs text-muted-foreground">Gains</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline">
                          Campagnes
                        </Button>
                        <Button size="sm" variant="outline">
                          Analytics
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des Parrainages</CardTitle>
                <CardDescription>
                  Nombre de parrainages par mois
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique d'évolution des parrainages
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI par Programme</CardTitle>
                <CardDescription>
                  Retour sur investissement par programme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique ROI
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sources de Parrainage</CardTitle>
                <CardDescription>
                  Répartition par canal de parrainage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique en secteurs
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Influenceurs</CardTitle>
                <CardDescription>
                  Comparaison des performances par plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique comparatif
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
