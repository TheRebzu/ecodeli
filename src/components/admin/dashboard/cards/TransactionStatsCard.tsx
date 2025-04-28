import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionStats } from '@/types/admin/dashboard';
import {
  CreditCardIcon,
  TrendingUpIcon,
  ArrowUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TransactionStatsCardProps {
  data?: TransactionStats;
  expanded?: boolean;
}

const TransactionStatsCard = ({ data, expanded = false }: TransactionStatsCardProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  // Formatter les montants en euros
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculer le pourcentage de chaque statut
  const total = data.status.completed + data.status.pending + data.status.failed;
  const completedPercentage = total > 0 ? Math.round((data.status.completed / total) * 100) : 0;
  const pendingPercentage = total > 0 ? Math.round((data.status.pending / total) * 100) : 0;
  const failedPercentage = total > 0 ? Math.round((data.status.failed / total) * 100) : 0;

  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <CreditCardIcon className="h-5 w-5 mr-2" />
          Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background p-3 rounded-lg border">
              <p className="text-muted-foreground text-sm flex items-center">
                Total
                <TrendingUpIcon className="h-4 w-4 ml-1" />
              </p>
              <p className="text-2xl font-bold">{data.total}</p>
            </div>
            <div className="bg-background p-3 rounded-lg border">
              <div className="flex justify-between">
                <p className="text-muted-foreground text-sm">Aujourd&apos;hui</p>
                {data.today > 0 && (
                  <span className="text-xs text-green-500 bg-green-50 px-1.5 py-0.5 rounded flex items-center">
                    <ArrowUpIcon className="h-3 w-3 mr-0.5" />
                    {data.today}
                  </span>
                )}
              </div>
              <p className="text-xl font-semibold">{formatCurrency(data.volume.today)}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Volume de transactions</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                <p className="text-lg font-semibold">{formatCurrency(data.volume.today)}</p>
              </div>
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Cette semaine</p>
                <p className="text-lg font-semibold">{formatCurrency(data.volume.thisWeek)}</p>
              </div>
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Ce mois</p>
                <p className="text-lg font-semibold">{formatCurrency(data.volume.thisMonth)}</p>
              </div>
            </div>
          </div>

          {expanded && (
            <div>
              <h4 className="text-sm font-medium mb-2">Statut des transactions</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-sm">Complétées</span>
                    </div>
                    <span className="text-sm font-medium">
                      {data.status.completed}{' '}
                      <span className="text-muted-foreground">({completedPercentage}%)</span>
                    </span>
                  </div>
                  <Progress
                    value={completedPercentage}
                    className="h-2 bg-gray-100"
                    indicatorClassName="bg-green-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2 text-amber-500" />
                      <span className="text-sm">En attente</span>
                    </div>
                    <span className="text-sm font-medium">
                      {data.status.pending}{' '}
                      <span className="text-muted-foreground">({pendingPercentage}%)</span>
                    </span>
                  </div>
                  <Progress
                    value={pendingPercentage}
                    className="h-2 bg-gray-100"
                    indicatorClassName="bg-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <XCircleIcon className="h-4 w-4 mr-2 text-red-500" />
                      <span className="text-sm">Échouées</span>
                    </div>
                    <span className="text-sm font-medium">
                      {data.status.failed}{' '}
                      <span className="text-muted-foreground">({failedPercentage}%)</span>
                    </span>
                  </div>
                  <Progress
                    value={failedPercentage}
                    className="h-2 bg-gray-100"
                    indicatorClassName="bg-red-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionStatsCard;
