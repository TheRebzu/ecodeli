import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecentActivity, DocumentSubmissionDetails, DeliveryCompletedDetails, TransactionCompletedDetails } from '@/types/dashboard';
import { ActivityIcon, UserPlusIcon, FileTextIcon, TruckIcon, CreditCardIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@prisma/client';
import { useTranslations } from 'next-intl';

interface RecentActivitiesCardProps {
  data?: RecentActivity[];
  expanded?: boolean;
}

const RecentActivitiesCard = ({ data, expanded = false }: RecentActivitiesCardProps) => {
  const t = useTranslations('');
  const tCommon = useTranslations('common');

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <ActivityIcon className="h-5 w-5 mr-2" />
            {t('recentActivities.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{tCommon('loading')}</p>
        </CardContent>
      </Card>
    );
  }

  // Formater la date relative (maintenant, il y a 5 min, etc.)
  const formatRelativeTime = (timestamp: Date | string | number | null | undefined): string => {
    if (!timestamp) {
      return '';
    }
    
    try {
      const now = new Date();
      let dateToCompare: Date;
      
      if (timestamp instanceof Date) {
        dateToCompare = timestamp;
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        dateToCompare = new Date(timestamp);
        
        // Vérifier si la date est valide
        if (isNaN(dateToCompare.getTime())) {
          console.error('Invalid date format:', timestamp);
          return '';
        }
      } else {
        console.error('Invalid timestamp type:', typeof timestamp);
        return '';
      }
      
      const diffMs = now.getTime() - dateToCompare.getTime();
      const diffSec = Math.round(diffMs / 1000);
      const diffMin = Math.round(diffSec / 60);
      const diffHour = Math.round(diffMin / 60);
      const diffDay = Math.round(diffHour / 24);

      if (diffSec < 60) return t('recentActivities.time.justNow');
      if (diffMin < 60) return t('recentActivities.time.minutesAgo', { count: diffMin });
      if (diffHour < 24) return t('recentActivities.time.hoursAgo', { count: diffHour });
      if (diffDay === 1) return t('recentActivities.time.yesterday');
      if (diffDay < 7) return t('recentActivities.time.daysAgo', { count: diffDay });

      // Utiliser l'API Intl pour le formatage de date localisé sans spécifier explicitement la locale
      return new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateToCompare);
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return '';
    }
  };

  // Obtenir l'icône correspondant au type d'activité
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserPlusIcon className="h-4 w-4 text-blue-500" />;
      case 'document_submission':
        return <FileTextIcon className="h-4 w-4 text-amber-500" />;
      case 'delivery_completed':
        return <TruckIcon className="h-4 w-4 text-green-500" />;
      case 'transaction_completed':
        return <CreditCardIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <ActivityIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  // Obtenir le titre de l'activité
  const getActivityTitle = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'user_registration':
        return t('recentActivities.types.userRegistration');
      case 'document_submission':
        return t('recentActivities.types.documentSubmission');
      case 'delivery_completed':
        return t('recentActivities.types.deliveryCompleted');
      case 'transaction_completed':
        return t('recentActivities.types.transactionCompleted');
      default:
        return t('recentActivities.types.default');
    }
  };

  // Obtenir la description de l'activité
  const getActivityDescription = (activity: RecentActivity) => {
    const userName = activity.user?.name || activity.user?.email || '';
    
    switch (activity.type) {
      case 'user_registration':
        return t('recentActivities.descriptions.userRegistration', { userName });
      case 'document_submission': {
        const details = activity.details as Partial<DocumentSubmissionDetails>;
        return t('recentActivities.descriptions.documentSubmission', { 
          userName, 
          documentType: details.documentType || 'document'
        });
      }
      case 'delivery_completed': {
        const details = activity.details as Partial<DeliveryCompletedDetails>;
        return t('recentActivities.descriptions.deliveryCompleted', { 
          from: details.from || '—', 
          to: details.to || '—'
        });
      }
      case 'transaction_completed': {
        const details = activity.details as Partial<TransactionCompletedDetails>;
        const amount = details.amount ? (details.amount as number).toLocaleString() : '0';
        return t('recentActivities.descriptions.transactionCompleted', { 
          amount,
          currency: details.currency || 'EUR'
        });
      }
      default:
        return t('recentActivities.descriptions.default');
    }
  };

  // Définir les couleurs par rôle
  const roleColors: Record<UserRole, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    CLIENT: 'bg-blue-100 text-blue-800',
    DELIVERER: 'bg-green-100 text-green-800',
    MERCHANT: 'bg-purple-100 text-purple-800',
    PROVIDER: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <ActivityIcon className="h-5 w-5 mr-2" />
          {t('recentActivities.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-muted-foreground text-center p-4">{t('recentActivities.noActivities')}</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {data.map((activity, index) => (
              <div key={activity.id || `activity-${index}`} className="flex items-start space-x-4 p-3 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{getActivityTitle(activity)}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {getActivityDescription(activity)}
                  </p>
                  {activity.user && (
                    <div className="mt-1">
                      <Badge className={`text-xs ${roleColors[activity.user.role]}`}>
                        {t(`roles.${activity.user.role.toLowerCase()}`)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivitiesCard;
