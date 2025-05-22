import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserStats } from '@/types/admin/dashboard';
import { UserIcon, UsersIcon } from 'lucide-react';

interface UserStatsCardProps {
  data?: UserStats;
  expanded?: boolean;
}

const UserStatsCard = ({ data, expanded = false }: UserStatsCardProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Statistiques utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  const roleColors: Record<string, string> = {
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
          <UsersIcon className="h-5 w-5 mr-2" />
          Statistiques utilisateurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background p-3 rounded-lg border">
              <p className="text-muted-foreground text-sm">Total utilisateurs</p>
              <p className="text-2xl font-bold">{data.total}</p>
            </div>
            <div className="bg-background p-3 rounded-lg border">
              <p className="text-muted-foreground text-sm">Actifs aujourd&apos;hui</p>
              <p className="text-2xl font-bold">{data.activeUsers?.today || 0}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Nouveaux utilisateurs</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Aujourd&apos;hui</p>
                <p className="text-lg font-semibold">{data.newUsers.today}</p>
              </div>
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Cette semaine</p>
                <p className="text-lg font-semibold">{data.newUsers.thisWeek}</p>
              </div>
              <div className="bg-background p-2 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Ce mois</p>
                <p className="text-lg font-semibold">{data.newUsers.thisMonth}</p>
              </div>
            </div>
          </div>

          {expanded && (
            <div>
              <h4 className="text-sm font-medium mb-2">Distribution par rôle</h4>
              <div className="space-y-2">
                {Object.entries(data.roleDistribution || {}).map(([role, count]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2" />
                      <span
                        className={`px-2 py-1 rounded-md text-xs ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {role}
                      </span>
                    </div>
                    <span className="font-semibold">{count}</span>
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

export default UserStatsCard;
