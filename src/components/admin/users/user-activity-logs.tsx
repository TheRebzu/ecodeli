import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Filter, X, Activity, Search, RefreshCw, Download, ExternalLink, Shield, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { ActivityType, UserActivityLogItem } from '@/types/admin';
import { 
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Mapping des types d'activité vers des libellés et couleurs
const activityTypeLabels: Record<ActivityType, { label: string; color: string; icon: any }> = {
  [ActivityType.LOGIN]: { 
    label: 'Connexion', 
    color: 'bg-green-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.LOGOUT]: { 
    label: 'Déconnexion', 
    color: 'bg-blue-500',
    icon: <ExternalLink className="h-4 w-4" />
  },
  [ActivityType.PROFILE_UPDATE]: { 
    label: 'Mise à jour du profil', 
    color: 'bg-orange-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.PASSWORD_CHANGE]: { 
    label: 'Changement de mot de passe', 
    color: 'bg-amber-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.STATUS_CHANGE]: { 
    label: 'Changement de statut', 
    color: 'bg-purple-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.ROLE_CHANGE]: { 
    label: 'Changement de rôle', 
    color: 'bg-indigo-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.VERIFICATION_SUBMIT]: { 
    label: 'Soumission de vérification', 
    color: 'bg-lime-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.VERIFICATION_REVIEW]: { 
    label: 'Revue de vérification', 
    color: 'bg-cyan-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.DOCUMENT_UPLOAD]: { 
    label: 'Téléchargement de document', 
    color: 'bg-emerald-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.ACCOUNT_CREATION]: { 
    label: 'Création de compte', 
    color: 'bg-sky-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.EMAIL_VERIFIED]: { 
    label: 'Email vérifié', 
    color: 'bg-green-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.PHONE_VERIFIED]: { 
    label: 'Téléphone vérifié', 
    color: 'bg-green-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.PASSWORD_RESET]: { 
    label: 'Réinitialisation de mot de passe', 
    color: 'bg-amber-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.PASSWORD_RESET_REQUEST]: { 
    label: 'Demande de réinitialisation', 
    color: 'bg-amber-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.ACCOUNT_LOCKED]: { 
    label: 'Compte verrouillé', 
    color: 'bg-red-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.ACCOUNT_UNLOCKED]: { 
    label: 'Compte déverrouillé', 
    color: 'bg-green-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.FAILED_LOGIN_ATTEMPT]: { 
    label: 'Tentative échouée', 
    color: 'bg-red-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.PERMISSION_CHANGE]: { 
    label: 'Changement de permissions', 
    color: 'bg-indigo-500',
    icon: <Shield className="h-4 w-4" />
  },
  [ActivityType.SUBSCRIPTION_CHANGE]: { 
    label: 'Changement d\'abonnement', 
    color: 'bg-emerald-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.PAYMENT_METHOD_ADDED]: { 
    label: 'Méthode de paiement ajoutée', 
    color: 'bg-emerald-500',
    icon: <Activity className="h-4 w-4" />
  },
  [ActivityType.OTHER]: { 
    label: 'Autre', 
    color: 'bg-gray-500',
    icon: <Activity className="h-4 w-4" />
  },
};

interface UserActivityLogsProps {
  userId: string;
  logs: UserActivityLogItem[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: {
    types?: ActivityType[];
    searchTerm?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortDirection?: 'asc' | 'desc';
  }) => void;
  onRefresh: () => void;
  onExport: () => void;
  onAddLog?: (data: { activityType: ActivityType; details: string }) => void;
}

export function UserActivityLogs({
  logs,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  onFilterChange,
  onRefresh,
  onExport,
  onAddLog,
}: UserActivityLogsProps) {
  const [activeFilters, setActiveFilters] = useState<{
    types?: ActivityType[];
    searchTerm?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortDirection?: 'asc' | 'desc';
  }>({
    sortDirection: 'desc'
  });

  const [selectedActivityTypes, setSelectedActivityTypes] = useState<ActivityType[]>([]);
  const [newLogDetails, setNewLogDetails] = useState('');
  const [newLogType, setNewLogType] = useState<ActivityType>(ActivityType.OTHER);

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...activeFilters, ...newFilters };
    setActiveFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilter = (filterKey: string) => {
    const newFilters = { ...activeFilters };
    // @ts-ignore
    delete newFilters[filterKey];
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleAddActivityLog = () => {
    if (onAddLog) {
      onAddLog({
        activityType: newLogType,
        details: newLogDetails
      });
      setNewLogDetails('');
      setNewLogType(ActivityType.OTHER);
    }
  };

  const handleTypeSelect = (type: ActivityType) => {
    if (selectedActivityTypes.includes(type)) {
      setSelectedActivityTypes(selectedActivityTypes.filter(t => t !== type));
    } else {
      setSelectedActivityTypes([...selectedActivityTypes, type]);
    }
  };

  const applyTypeFilter = () => {
    handleFilterChange({ types: selectedActivityTypes.length > 0 ? selectedActivityTypes : undefined });
  };

  const getActivityBadge = (type: ActivityType) => {
    const config = activityTypeLabels[type] || activityTypeLabels[ActivityType.OTHER];
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Journaux d'activité</CardTitle>
            <CardDescription>Historique des activités utilisateur et journal d'audit</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            {onAddLog && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm">
                    <Activity className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter une entrée d'activité</DialogTitle>
                    <DialogDescription>
                      Créer une nouvelle entrée dans le journal d'activité de cet utilisateur
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="activity-type">Type d'activité</Label>
                      <Select 
                        value={newLogType} 
                        onValueChange={(value) => setNewLogType(value as ActivityType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ActivityType).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {activityTypeLabels[value]?.label || value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="details">Détails</Label>
                      <Textarea
                        id="details"
                        placeholder="Entrez les détails de l'activité"
                        value={newLogDetails}
                        onChange={(e) => setNewLogDetails(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button 
                      onClick={handleAddActivityLog}
                      disabled={!newLogDetails.trim()}
                    >
                      Ajouter l'entrée
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-8 w-[250px]"
              value={activeFilters.searchTerm || ''}
              onChange={e => handleFilterChange({ searchTerm: e.target.value })}
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="w-4 h-4" />
                Types d'activité
                {activeFilters.types && activeFilters.types.length > 0 && (
                  <Badge className="ml-1 bg-primary" variant="default">
                    {activeFilters.types.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="p-4 border-b">
                <h4 className="font-medium mb-2">Filtrer par type d'activité</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(ActivityType).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`type-${key}`}
                        checked={selectedActivityTypes.includes(value)}
                        onChange={() => handleTypeSelect(value)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`type-${key}`} className="text-sm flex items-center">
                        {activityTypeLabels[value]?.label || value}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedActivityTypes([])}
                  >
                    Effacer
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={applyTypeFilter}
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Période
                {(activeFilters.dateFrom || activeFilters.dateTo) && (
                  <Badge className="ml-1 bg-primary" variant="default">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
              <div className="space-y-2">
                <h4 className="font-medium">Filtrer par date</h4>
                <div className="grid gap-2">
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <label htmlFor="from">Du</label>
                      <DatePicker
                        value={activeFilters.dateFrom}
                        onChange={date => handleFilterChange({ dateFrom: date })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <label htmlFor="to">Au</label>
                      <DatePicker
                        value={activeFilters.dateTo}
                        onChange={date => handleFilterChange({ dateTo: date })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearFilter('dateFrom');
                      clearFilter('dateTo');
                    }}
                  >
                    Effacer les dates
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select
            value={activeFilters.sortDirection || 'desc'}
            onValueChange={(value) => handleFilterChange({ sortDirection: value })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Plus récent d'abord</SelectItem>
              <SelectItem value="asc">Plus ancien d'abord</SelectItem>
            </SelectContent>
          </Select>

          {/* Affichage des filtres actifs */}
          {(activeFilters.types?.length || activeFilters.searchTerm || activeFilters.dateFrom || activeFilters.dateTo) && (
            <div className="flex flex-wrap gap-2 mt-2 ml-1">
              {activeFilters.types && activeFilters.types.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Types d'activité ({activeFilters.types.length})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => clearFilter('types')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {activeFilters.searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Recherche: {activeFilters.searchTerm}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => clearFilter('searchTerm')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {(activeFilters.dateFrom || activeFilters.dateTo) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Période
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => {
                      clearFilter('dateFrom');
                      clearFilter('dateTo');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setActiveFilters({ sortDirection: activeFilters.sortDirection });
                  onFilterChange({ sortDirection: activeFilters.sortDirection });
                }}
              >
                Effacer tous les filtres
              </Button>
            </div>
          )}
        </div>

        {/* Tableau des journaux d'activité */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune activité trouvée avec les filtres actuels.
          </div>
        ) : (
          <div className="overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead width={220}>Date et heure</TableHead>
                  <TableHead width={180}>Type d'activité</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead width={150}>Adresse IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(log.createdAt), 'dd/MM/yyyy')}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActivityBadge(log.activityType)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.details || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && logs.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Affichage de {Math.min(limit, logs.length)} sur {total} entrées
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                Précédent
              </Button>
              <span className="text-sm">
                Page {page} sur {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= Math.ceil(total / limit)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
