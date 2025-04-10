import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, CheckCircle, Clock, PiggyBank } from "lucide-react";
import { AnnouncementStats } from "@/components/announcements/announcement-stats";

export async function AnnouncementStatsCards({ userId }: { userId: string }) {
  // Récupérer les statistiques des annonces
  const stats = await AnnouncementStats({ userId });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Annonces actives
          </CardTitle>
          <Boxes className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeCount > 0
              ? `${stats.pendingBidsCount} offres en attente`
              : "Aucune annonce active"}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Annonces terminées
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.completedCount > 0
              ? `${stats.completedPercentage}% de complétion`
              : "Aucune annonce terminée"}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            En cours de livraison
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inProgressCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.inProgressCount > 0
              ? `${stats.inProgressCount} annonces en cours`
              : "Aucune livraison en cours"}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Dépenses totales
          </CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSpent} €</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalCount > 0
              ? `${stats.avgPrice} € en moyenne par livraison`
              : "Aucune dépense enregistrée"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 