import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryStats } from '@/types/dashboard';
import { TruckIcon, ClockIcon, XCircleIcon } from 'lucide-react';

interface DeliveryStatsCardProps {
  data?: DeliveryStats;
  expanded?: boolean;
}

const DeliveryStatsCard = ({ data, expanded = false }: DeliveryStatsCardProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <TruckIcon className="h-5 w-5 mr-2" />
            Livraisons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  // S'assurer que data.completed existe, sinon créer un objet vide avec valeurs par défaut
  const completed = data.completed || { today: 0, thisWeek: 0, thisMonth: 0 };

  // Formater le temps moyen de livraison
  const formatDeliveryTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours} h ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`;
  };

  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <TruckIcon className="h-5 w-5 mr-2" />
          Livraisons
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background p-3 rounded-lg border">
              <div className="flex items-center mb-1">
                <ClockIcon className="h-4 w-4 mr-1 text-amber-500" />
                <p className="text-muted-foreground text-sm">Livraisons actives</p>
              </div>
              <p className="text-2xl font-bold text-amber-500">{data.active}</p>
            </div>
            <div className="bg-background p-3 rounded-lg border">
              <div className="flex items-center mb-1">
                <XCircleIcon className="h-4 w-4 mr-1 text-red-500" />
                <p className="text-muted-foreground text-sm">Annulées</p>
              </div>
              <p className="text-2xl font-bold text-red-500">{data.cancelled}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Temps moyen de livraison</h4>
            <div className="bg-background p-3 rounded-lg border">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  De la prise en charge à la livraison
                </p>
                <p className="text-lg font-bold">{formatDeliveryTime(data.avgDeliveryTime || 0)}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Livraisons terminées</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Aujourd&apos;hui</p>
                <p className="text-lg font-semibold text-green-500">{completed.today}</p>
              </div>
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Cette semaine</p>
                <p className="text-lg font-semibold text-green-500">{completed.thisWeek}</p>
              </div>
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Ce mois</p>
                <p className="text-lg font-semibold text-green-500">{completed.thisMonth}</p>
              </div>
            </div>
          </div>

          {expanded && (
            <div>
              <h4 className="text-sm font-medium mb-2">Performance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Taux de complétion</p>
                  <p className="text-xl font-semibold">
                    {data.active + data.cancelled + completed.thisMonth > 0
                      ? Math.round(
                          (completed.thisMonth /
                            (data.active + data.cancelled + completed.thisMonth)) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div className="bg-background p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Taux d&apos;annulation</p>
                  <p className="text-xl font-semibold">
                    {data.active + data.cancelled + completed.thisMonth > 0
                      ? Math.round(
                          (data.cancelled /
                            (data.active + data.cancelled + completed.thisMonth)) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryStatsCard;
