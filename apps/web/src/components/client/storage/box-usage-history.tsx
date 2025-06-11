'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BoxUsageHistoryRecord, BoxActionType } from '@/types/warehouses/storage-box';
import { DoorOpen, DoorClosed, Clock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface BoxUsageHistoryProps {
  history: BoxUsageHistoryRecord[];
}

export function BoxUsageHistory({ history }: BoxUsageHistoryProps) {
  const t = useTranslations('storage');

  if (!history || history.length === 0) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>{t('history.noHistoryTitle')}</AlertTitle>
        <AlertDescription>{t('history.noHistoryDescription')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {history.map(record => (
              <div
                key={record.id}
                className="flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0"
              >
                <div
                  className={`p-2 rounded-full flex-shrink-0 ${
                    record.actionType === BoxActionType.ACCESS
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : record.actionType === BoxActionType.DEPARTURE
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {record.actionType === BoxActionType.ACCESS ? (
                    <DoorOpen className="h-4 w-4" />
                  ) : record.actionType === BoxActionType.DEPARTURE ? (
                    <DoorClosed className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-medium">
                    {t(`history.actionTypes.${record.actionType.toLowerCase()}`)}
                  </p>

                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(new Date(record.timestamp), 'PPP à HH:mm', { locale: fr })}</span>
                  </div>

                  {record.performedBy && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{record.performedBy}</span>
                    </div>
                  )}

                  {record.notes && <p className="mt-2 text-sm">{record.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
