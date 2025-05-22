import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionItems } from '@/types/admin/dashboard';
import {
  BellIcon,
  FileWarningIcon,
  CalendarIcon,
  AlertTriangleIcon,
  PackageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ActionItemsCardProps {
  data?: ActionItems;
  expanded?: boolean;
}

const ActionItemsCard = ({ data, expanded = false }: ActionItemsCardProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <BellIcon className="h-5 w-5 mr-2" />
            Actions requises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  // Calculer le nombre total d'actions requises
  const totalActions =
    data.pendingVerifications +
    data.expiringContracts +
    data.openReports +
    data.lowInventoryWarehouses;

  // Définir les éléments à afficher
  const actionItems = [
    {
      id: 'verifications',
      icon: <FileWarningIcon className="h-4 w-4" />,
      label: 'Documents à vérifier',
      count: data.pendingVerifications,
      url: '/admin/verifications',
      color: 'text-amber-500',
    },
    {
      id: 'contracts',
      icon: <CalendarIcon className="h-4 w-4" />,
      label: 'Contrats expirant',
      count: data.expiringContracts,
      url: '/admin/merchants/contracts',
      color: 'text-blue-500',
    },
    {
      id: 'reports',
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      label: 'Signalements ouverts',
      count: data.openReports,
      url: '/admin/reports',
      color: 'text-red-500',
    },
    {
      id: 'warehouses',
      icon: <PackageIcon className="h-4 w-4" />,
      label: 'Entrepôts à surveiller',
      count: data.lowInventoryWarehouses,
      url: '/admin/warehouses',
      color: 'text-purple-500',
    },
  ];

  // Filtre pour afficher seulement les éléments avec des actions à prendre
  const filteredItems = expanded ? actionItems : actionItems.filter(item => item.count > 0);

  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <BellIcon className="h-5 w-5 mr-2" />
          Actions requises
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalActions === 0 ? (
          <div className="text-center p-6">
            <p className="text-muted-foreground mb-2">Tout est à jour !</p>
            <p className="text-xs text-muted-foreground">
              Aucune action immédiate n&apos;est requise pour le moment
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center">
                  <div className={`mr-3 ${item.color}`}>{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} élément{item.count > 1 ? 's' : ''} en attente
                    </p>
                  </div>
                </div>
                <Link href={item.url} locale={false}>
                  <Button variant="outline" size="sm">
                    Voir
                  </Button>
                </Link>
              </div>
            ))}

            {!expanded && totalActions > filteredItems.length && (
              <div className="text-center mt-2">
                <p className="text-xs text-muted-foreground">
                  + {totalActions - filteredItems.length} autres actions
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionItemsCard;
