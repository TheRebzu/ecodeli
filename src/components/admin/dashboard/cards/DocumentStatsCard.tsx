import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentStats } from '@/types/admin/dashboard';
import { FileIcon, AlertCircleIcon, FolderIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@prisma/client';

interface DocumentStatsCardProps {
  data?: DocumentStats;
  expanded?: boolean;
}

const DocumentStatsCard = ({ data, expanded = false }: DocumentStatsCardProps) => {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <FileIcon className="h-5 w-5 mr-2" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  const roleColors: Record<UserRole, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    CLIENT: 'bg-blue-100 text-blue-800',
    DELIVERER: 'bg-green-100 text-green-800',
    MERCHANT: 'bg-purple-100 text-purple-800',
    PROVIDER: 'bg-yellow-100 text-yellow-800',
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <FileIcon className="h-5 w-5 mr-2" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background p-2 rounded-lg border text-center">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-lg font-semibold text-amber-500">{data.pending}</p>
            </div>
            <div className="bg-background p-2 rounded-lg border text-center">
              <p className="text-xs text-muted-foreground">Approuvés</p>
              <p className="text-lg font-semibold text-green-500">{data.approved}</p>
            </div>
            <div className="bg-background p-2 rounded-lg border text-center">
              <p className="text-xs text-muted-foreground">Rejetés</p>
              <p className="text-lg font-semibold text-red-500">{data.rejected}</p>
            </div>
          </div>

          {(expanded || data.recentlySubmitted.length > 0) && (
            <div>
              <h4 className="text-sm font-medium mb-2">Documents récemment soumis</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {data.recentlySubmitted.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-2 rounded-lg border text-sm"
                  >
                    <div className="flex items-start">
                      <FolderIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{doc.type}</p>
                        <p className="text-xs text-muted-foreground">
                          Par {doc.user.name || doc.user.email} · {formatDate(doc.submittedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className={roleColors[doc.user.role]}>{doc.user.role}</Badge>
                  </div>
                ))}
                {data.recentlySubmitted.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center p-2">
                    Aucun document récent
                  </p>
                )}
              </div>
            </div>
          )}

          {expanded && (
            <div>
              <h4 className="text-sm font-medium mb-2">Documents en attente par rôle</h4>
              <div className="space-y-2">
                {Object.entries(data.pendingByRole).map(([role, count]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center">
                      <AlertCircleIcon className="h-4 w-4 mr-2 text-amber-500" />
                      <Badge
                        className={roleColors[role as UserRole] || 'bg-gray-100 text-gray-800'}
                      >
                        {role}
                      </Badge>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(data.pendingByRole).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center p-2">
                    Aucun document en attente
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentStatsCard;
