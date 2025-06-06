'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  Truck,
  MapPin,
} from 'lucide-react';

interface DeliverersStatsProps {
  data: {
    totalDeliverers: number;
    activeDeliverers: number;
    verifiedDeliverers: number;
    pendingVerification: number;
    suspendedDeliverers: number;
    averageRating: number;
    totalDeliveries: number;
    averageEarnings: number;
    vehicledDeliverers: number;
    topPerformers: Array<{
      id: string;
      name: string;
      rating: number;
      deliveries: number;
    }>;
    growthRate: number;
    activeZones: number;
  };
}

export function DeliverersStats({ data }: DeliverersStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getGrowthIcon = (rate: number) => {
    if (rate > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (rate < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getGrowthColor = (rate: number) => {
    if (rate > 0) return 'text-green-600';
    if (rate < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total des livreurs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Livreurs</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalDeliverers}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {getGrowthIcon(data.growthRate)}
            <span className={getGrowthColor(data.growthRate)}>
              {data.growthRate > 0 ? '+' : ''}{data.growthRate.toFixed(1)}% ce mois
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Livreurs actifs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Livreurs Actifs</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeDeliverers}</div>
          <p className="text-xs text-muted-foreground">
            {Math.round((data.activeDeliverers / data.totalDeliverers) * 100)}% du total
          </p>
        </CardContent>
      </Card>

      {/* Livreurs vérifiés */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vérifiés</CardTitle>
          <Badge variant="default" className="bg-green-100 text-green-800 h-4 w-4 p-0 flex items-center justify-center">
            ✓
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.verifiedDeliverers}</div>
          <p className="text-xs text-muted-foreground">
            {data.pendingVerification} en attente de vérification
          </p>
        </CardContent>
      </Card>

      {/* Note moyenne */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.averageRating.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            Sur {data.totalDeliveries} livraisons
          </p>
        </CardContent>
      </Card>

      {/* Gains moyens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gains Moyens</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.averageEarnings)}</div>
          <p className="text-xs text-muted-foreground">
            Par livreur ce mois
          </p>
        </CardContent>
      </Card>

      {/* Livreurs véhiculés */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Véhiculés</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.vehicledDeliverers}</div>
          <p className="text-xs text-muted-foreground">
            {Math.round((data.vehicledDeliverers / data.totalDeliverers) * 100)}% ont un véhicule
          </p>
        </CardContent>
      </Card>

      {/* Zones actives */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Zones Couvertes</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeZones}</div>
          <p className="text-xs text-muted-foreground">
            Zones avec livreurs actifs
          </p>
        </CardContent>
      </Card>

      {/* Livreurs suspendus */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Suspendus</CardTitle>
          <UserX className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{data.suspendedDeliverers}</div>
          <p className="text-xs text-muted-foreground">
            Nécessitent une attention
          </p>
        </CardContent>
      </Card>

      {/* Top performers - Carte plus large */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">Top Performers</CardTitle>
          <CardDescription>
            Les meilleurs livreurs du mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data.topPerformers.map((performer, index) => (
              <div
                key={performer.id}
                className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/50"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    #{index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {performer.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {performer.rating.toFixed(1)}
                    </div>
                    <span>•</span>
                    <span>{performer.deliveries} livraisons</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 