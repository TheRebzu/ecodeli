'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Search,
  User,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Issue = {
  id: string;
  deliveryId: string;
  trackingNumber: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  type: 'DELAY' | 'DAMAGED' | 'LOST' | 'WRONG_ADDRESS' | 'OTHER';
  description: string;
  createdAt: Date;
  updatedAt: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTo?: string;
  client: {
    id: string;
    name: string;
    image?: string;
  };
  deliverer?: {
    id: string;
    name: string;
    image?: string;
  };
};

export function DeliveryIssues() {
  const t = useTranslations('admin.deliveries');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { toast } = useToast();

  // Récupérer les incidents depuis l'API
  const {
    data: issues,
    isLoading,
    error,
  } = api.deliveryIssue.getAll.useQuery(
    {
      status:
        activeTab === 'pending'
          ? 'PENDING'
          : activeTab === 'in-progress'
            ? 'IN_PROGRESS'
            : 'RESOLVED',
    },
    {
      onError: err => {
        toast({
          title: 'Erreur',
          description: `Impossible de charger les incidents: ${err.message}`,
          variant: 'destructive',
        });
      },
    }
  );

  // Utilisation de la mutation pour mettre à jour le statut d'un incident
  const updateIssueMutation = api.deliveryIssue.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: 'Succès',
        description: "Le statut de l'incident a été mis à jour",
      });
    },
    onError: err => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour l'incident: ${err.message}`,
        variant: 'destructive',
      });
    },
  });

  // Filtrer les incidents
  const filteredIssues =
    issues?.filter(issue => {
      // Filtre par recherche
      if (
        searchTerm &&
        !issue.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !issue.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !issue.client.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Filtre par priorité
      if (priorityFilter && issue.priority !== priorityFilter) return false;

      // Filtre par type
      if (typeFilter && issue.type !== typeFilter) return false;

      return true;
    }) || [];

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="outline">Basse</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">Moyenne</Badge>;
      case 'HIGH':
        return <Badge variant="destructive">Haute</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">En attente</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="secondary">En traitement</Badge>;
      case 'RESOLVED':
        return <Badge variant="success">Résolu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'DELAY':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Retard
          </Badge>
        );
      case 'DAMAGED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
            Endommagé
          </Badge>
        );
      case 'LOST':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            Perdu
          </Badge>
        );
      case 'WRONG_ADDRESS':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Mauvaise adresse
          </Badge>
        );
      case 'OTHER':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Autre
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Fonction pour changer le statut d'un incident
  const handleStatusChange = (
    issueId: string,
    newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'
  ) => {
    updateIssueMutation.mutate({ id: issueId, status: newStatus });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Incidents</CardTitle>
        <CardDescription>
          Suivez et gérez tous les problèmes signalés concernant les livraisons
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro de suivi, description..."
                className="pl-8 w-full md:w-[300px]"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes</SelectItem>
                  <SelectItem value="LOW">Basse</SelectItem>
                  <SelectItem value="MEDIUM">Moyenne</SelectItem>
                  <SelectItem value="HIGH">Haute</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Type d'incident" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  <SelectItem value="DELAY">Retard</SelectItem>
                  <SelectItem value="DAMAGED">Endommagé</SelectItem>
                  <SelectItem value="LOST">Perdu</SelectItem>
                  <SelectItem value="WRONG_ADDRESS">Mauvaise adresse</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                En attente
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                En traitement
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Résolus
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="m-0">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error.message} />
              ) : (
                <IssuesTable
                  issues={filteredIssues}
                  renderPriorityBadge={renderPriorityBadge}
                  renderStatusBadge={renderStatusBadge}
                  renderTypeBadge={renderTypeBadge}
                  onStatusChange={handleStatusChange}
                  isUpdating={updateIssueMutation.isLoading}
                />
              )}
            </TabsContent>
            <TabsContent value="in-progress" className="m-0">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error.message} />
              ) : (
                <IssuesTable
                  issues={filteredIssues}
                  renderPriorityBadge={renderPriorityBadge}
                  renderStatusBadge={renderStatusBadge}
                  renderTypeBadge={renderTypeBadge}
                  onStatusChange={handleStatusChange}
                  isUpdating={updateIssueMutation.isLoading}
                />
              )}
            </TabsContent>
            <TabsContent value="resolved" className="m-0">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error.message} />
              ) : (
                <IssuesTable
                  issues={filteredIssues}
                  renderPriorityBadge={renderPriorityBadge}
                  renderStatusBadge={renderStatusBadge}
                  renderTypeBadge={renderTypeBadge}
                  onStatusChange={handleStatusChange}
                  isUpdating={updateIssueMutation.isLoading}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

interface IssuesTableProps {
  issues: Issue[];
  renderPriorityBadge: (priority: string) => React.ReactNode;
  renderStatusBadge: (status: string) => React.ReactNode;
  renderTypeBadge: (type: string) => React.ReactNode;
  onStatusChange: (issueId: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED') => void;
  isUpdating: boolean;
}

function IssuesTable({
  issues,
  renderPriorityBadge,
  renderStatusBadge,
  renderTypeBadge,
  onStatusChange,
  isUpdating,
}: IssuesTableProps) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">Aucun incident trouvé</p>
        <p className="text-muted-foreground">
          Il n'y a pas d'incidents correspondant à vos critères de recherche
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numéro de suivi</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Livreur</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map(issue => (
            <TableRow key={issue.id}>
              <TableCell className="font-medium">{issue.trackingNumber}</TableCell>
              <TableCell>{renderTypeBadge(issue.type)}</TableCell>
              <TableCell className="max-w-[200px] truncate">{issue.description}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={issue.client.image} alt={issue.client.name} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{issue.client.name}</span>
                </div>
              </TableCell>
              <TableCell>
                {issue.deliverer ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={issue.deliverer.image} alt={issue.deliverer.name} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{issue.deliverer.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Non assigné</span>
                )}
              </TableCell>
              <TableCell>{renderPriorityBadge(issue.priority)}</TableCell>
              <TableCell>{renderStatusBadge(issue.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(issue.createdAt).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <div className="relative">
                    <Select
                      disabled={isUpdating}
                      value={issue.status}
                      onValueChange={value =>
                        onStatusChange(issue.id, value as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED')
                      }
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue placeholder="Changer le statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">En attente</SelectItem>
                        <SelectItem value="IN_PROGRESS">En traitement</SelectItem>
                        <SelectItem value="RESOLVED">Résolu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="border rounded-md p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="border rounded-md p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
      <h3 className="font-semibold mb-1">Erreur lors du chargement des incidents</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
