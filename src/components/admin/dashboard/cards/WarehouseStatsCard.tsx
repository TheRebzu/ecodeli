import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WarehouseStats } from '@/types/dashboard';
import { WarehouseIcon, PackageIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface WarehouseStatsCardProps {
  data?: WarehouseStats;
  expanded?: boolean;
}

const WarehouseStatsCard = ({ data, expanded = false }: WarehouseStatsCardProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <WarehouseIcon className="h-5 w-5 mr-2" />
            Entrepôts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  // Déterminer la couleur basée sur le taux d'occupation
  const getOccupancyColor = (rate: number) => {
    if (rate > 90) return 'text-red-500';
    if (rate > 75) return 'text-amber-500';
    if (rate > 50) return 'text-blue-500';
    return 'text-green-500';
  };

  const getProgressColor = (rate: number) => {
    if (rate > 90) return 'bg-red-500';
    if (rate > 75) return 'bg-amber-500';
    if (rate > 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <WarehouseIcon className="h-5 w-5 mr-2" />
          Entrepôts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background p-3 rounded-lg border">
              <p className="text-muted-foreground text-sm">Total entrepôts</p>
              <p className="text-2xl font-bold">{data.total}</p>
            </div>
            <div className="bg-background p-3 rounded-lg border">
              <p className="text-muted-foreground text-sm">Capacité totale</p>
              <p className="text-2xl font-bold">{data.totalCapacity.toLocaleString('fr-FR')}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium">Taux d&apos;occupation global</h4>
              <span className={`text-sm font-bold ${getOccupancyColor(data.occupancyRate)}`}>
                {Math.round(data.occupancyRate)}%
              </span>
            </div>
            <Progress
              value={data.occupancyRate}
              className="h-2.5 bg-gray-100"
              indicatorClassName={getProgressColor(data.occupancyRate)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.occupiedCapacity.toLocaleString('fr-FR')} /{' '}
              {data.totalCapacity.toLocaleString('fr-FR')} unités utilisées
            </p>
          </div>

          {expanded && data.warehouseOccupancy.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Détail par entrepôt</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.warehouseOccupancy.map(warehouse => (
                  <div key={warehouse.id} className="bg-background p-3 rounded-lg border">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h5 className="text-sm font-medium">{warehouse.name}</h5>
                        <p className="text-xs text-muted-foreground">{warehouse.location}</p>
                      </div>
                      <span
                        className={`text-sm font-bold ${getOccupancyColor(warehouse.occupancyRate)}`}
                      >
                        {Math.round(warehouse.occupancyRate)}%
                      </span>
                    </div>
                    <Progress
                      value={warehouse.occupancyRate}
                      className="h-2 bg-gray-100"
                      indicatorClassName={getProgressColor(warehouse.occupancyRate)}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground flex items-center">
                        <PackageIcon className="h-3 w-3 mr-1" />
                        {warehouse.occupied.toLocaleString('fr-FR')} /{' '}
                        {warehouse.capacity.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WarehouseStatsCard;
