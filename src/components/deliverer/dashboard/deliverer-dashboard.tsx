'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import {
  Truck,
  Euro,
  Star,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Navigation,
  Calendar,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import DocumentVerificationStatus from '@/components/deliverer/documents/document-verification-status';

const StatCard = ({
  title,
  value,
  icon,
  trend,
  isLoading = false,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  onClick?: () => void;
}) => {
  if (isLoading) {
    return (
      <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            {trend && <Skeleton className="h-4 w-12" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
          </div>
          {trend && (
            <div className="text-right">
              <p
                className={`text-xs flex items-center gap-1 ${
                  trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </p>
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ActiveDeliveryCard = ({
  delivery,
  onNavigate,
}: {
  delivery: any;
  onNavigate: (deliveryId: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP':
        return 'bg-purple-100 text-purple-800';
      case 'IN_TRANSIT':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'Acceptée';
      case 'PICKED_UP':
        return 'Récupérée';
      case 'IN_TRANSIT':
        return 'En transit';
      default:
        return status;
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{delivery.trackingCode}</span>
              <Badge className={getStatusColor(delivery.status)}>
                {getStatusLabel(delivery.status)}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{delivery.announcement?.pickupAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="h-3 w-3" />
                <span className="truncate">{delivery.announcement?.deliveryAddress}</span>
              </div>
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={() => onNavigate(delivery.id)}>
            Voir
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(delivery.createdAt), {
              addSuffix: true,
              locale: fr,
            })}
          </span>
          <span className="font-medium">{delivery.price}€</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DelivererDashboard() {
  const router = useRouter();

  // Récupérer les données du dashboard mobile
  const { data: dashboardData, isLoading } = api.delivery.deliverer.getMobileDashboard.useQuery();

  // Récupérer le statut de vérification
  const { data: verificationStatus } = api.delivery.verification.getDelivererStatus.useQuery();

  const stats = dashboardData?.stats;
  const activeDeliveries = dashboardData?.activeDeliveries || [];
  const earnings = dashboardData?.earnings;

  const handleNavigateToDelivery = (deliveryId: string) => {
    router.push(`/deliverer/deliveries/${deliveryId}`);
  };

  const isVerified = verificationStatus?.overallStatus === 'APPROVED';
  const hasActiveDeliveries = activeDeliveries.length > 0;

  return (
    <div className="space-y-6">
      {/* Verification Status Alert */}
      {!isVerified && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Vérification requise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-4">
              Votre compte doit être vérifié avant de pouvoir accepter des livraisons.
            </p>
            <Button onClick={() => router.push('/deliverer/documents')} variant="default">
              <FileText className="h-4 w-4 mr-2" />
              Gérer mes documents
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Livraisons totales"
          value={stats?.totalDeliveries || 0}
          icon={<Truck className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          onClick={() => router.push('/deliverer/deliveries')}
        />

        <StatCard
          title="Livraisons complétées"
          value={stats?.completedDeliveries || 0}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          trend={{ value: 12, label: 'ce mois' }}
          isLoading={isLoading}
        />

        <StatCard
          title="Note moyenne"
          value={stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
          icon={<Star className="h-4 w-4 text-yellow-500" />}
          isLoading={isLoading}
        />

        <StatCard
          title="Gains du mois"
          value={`${earnings?.month || 0}€`}
          icon={<Euro className="h-4 w-4 text-green-500" />}
          trend={{ value: 8, label: 'vs mois dernier' }}
          isLoading={isLoading}
          onClick={() => router.push('/deliverer/wallet')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Deliveries */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Livraisons actives
                </div>
                <Badge variant="secondary">{activeDeliveries.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : hasActiveDeliveries ? (
                <div className="space-y-4">
                  {activeDeliveries.slice(0, 3).map((delivery: any) => (
                    <ActiveDeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onNavigate={handleNavigateToDelivery}
                    />
                  ))}

                  {activeDeliveries.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push('/deliverer/deliveries')}
                    >
                      Voir toutes les livraisons ({activeDeliveries.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
                  <p className="text-muted-foreground">Aucune livraison active</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/deliverer/announcements')}
                  >
                    Parcourir les annonces
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Aujourd'hui
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Livraisons</span>
                <span className="font-medium">{dashboardData?.todayDeliveries || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gains</span>
                <span className="font-medium">{earnings?.today || 0}€</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Notifications</span>
                <Badge variant="secondary">{dashboardData?.unreadNotifications || 0}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/deliverer/schedule')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Gérer mon planning
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/deliverer/my-routes')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Mes trajets
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/deliverer/profile')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Mon profil
              </Button>
            </CardContent>
          </Card>

          {/* Verification Status (compact) */}
          {!isVerified && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Documents en attente</span>
                </div>
                <p className="text-xs text-yellow-700 mb-3">
                  Complétez votre vérification pour accepter des livraisons
                </p>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full"
                  onClick={() => router.push('/deliverer/documents')}
                >
                  Compléter
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detailed Verification Status (if needed) */}
      {!isVerified && <DocumentVerificationStatus />}
    </div>
  );
}
