import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecentActivity } from '@/types/admin/dashboard';
import { ActivityIcon, UserPlusIcon, FileTextIcon, TruckIcon, CreditCardIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@prisma/client';

interface RecentActivitiesCardProps {
  data?: RecentActivity[];
  expanded?: boolean;
}

const RecentActivitiesCard = ({ data, expanded = false }: RecentActivitiesCardProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <ActivityIcon className="h-5 w-5 mr-2" />
            Activités récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  // Formater la date relative (maintenant, il y a 5 min, etc.)
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    if (diffSec < 60) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffHour < 24) return `il y a ${diffHour} h`;
    if (diffDay === 1) return 'hier';
    if (diffDay < 7) return `il y a ${diffDay} jours`;

    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
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
        return 'Nouvel utilisateur';
      case 'document_submission':
        return 'Document soumis';
      case 'delivery_completed':
        return 'Livraison terminée';
      case 'transaction_completed':
        return 'Transaction complétée';
      default:
        return 'Activité';
    }
  };

  // Obtenir la description de l'activité
  const getActivityDescription = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'user_registration':
        return `${activity.user?.name || activity.user?.email} s'est inscrit`;
      case 'document_submission':
        return `${activity.user?.name || activity.user?.email} a soumis ${activity.details.documentType}`;
      case 'delivery_completed':
        return `Livraison de ${activity.details.from} à ${activity.details.to}`;
      case 'transaction_completed':
        return `Transaction de ${(activity.details.amount as number).toLocaleString('fr-FR')} ${activity.details.currency}`;
      default:
        return 'Nouvelle activité';
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
          Activités récentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center p-4">Aucune activité récente</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {data.map(activity => (
              <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg border">
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
                        {activity.user.role}
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
