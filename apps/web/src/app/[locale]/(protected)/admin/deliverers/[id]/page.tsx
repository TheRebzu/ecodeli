'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Star,
  Package,
  TrendingUp,
  AlertCircle,
  Edit,
  Ban,
  UserCheck,
} from 'lucide-react';
import { Link } from '@/navigation';
import { useToast } from '@/components/ui/use-toast';

type DelivererStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function DelivererDetailPage() {
  const params = useParams();
  const delivererId = params.id as string;
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  // Récupérer les données du livreur depuis la base de données
  const { data: delivererData, isLoading, error, refetch } = api.admin.deliverers.getById.useQuery({
    id: delivererId
  });

  // Mutations pour les actions
  const updateDelivererStatusMutation = api.admin.deliverers.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du livreur a été mis à jour avec succès.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour du statut: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Gestion des états de chargement et d'erreur
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (error || !delivererData) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-red-500">
          Erreur lors du chargement des données du livreur.
        </div>
      </div>
    );
  }

  const deliverer = delivererData;

  const getStatusBadge = (status: DelivererStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">Suspendu</Badge>;
      case 'PENDING_VERIFICATION':
        return <Badge variant="outline">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVerificationBadge = (status: VerificationStatus, isVerified: boolean) => {
    if (isVerified) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Vérifié
        </Badge>
      );
    }

    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejeté
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateObj);
  };

  const formatEarnings = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getCompletionRate = () => {
    if (deliverer.totalDeliveries === 0) return 0;
    return Math.round((deliverer.completedDeliveries / deliverer.totalDeliveries) * 100);
  };

  // Fonctions pour gérer les actions
  const handleActivateDeliverer = () => {
    setDialogAction({
      title: 'Activer le livreur',
      description: 'Êtes-vous sûr de vouloir activer ce livreur ?',
      action: () => {
        updateDelivererStatusMutation.mutate({
          userId: delivererId,
          status: 'ACTIVE',
        });
        setIsDialogOpen(false);
      },
    });
    setIsDialogOpen(true);
  };

  const handleSuspendDeliverer = () => {
    setDialogAction({
      title: 'Suspendre le livreur',
      description: 'Êtes-vous sûr de vouloir suspendre ce livreur ? Il perdra l\'accès à la plateforme.',
      action: () => {
        updateDelivererStatusMutation.mutate({
          userId: delivererId,
          status: 'SUSPENDED',
        });
        setIsDialogOpen(false);
      },
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {deliverer.firstName[0]}{deliverer.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">
              {deliverer.firstName} {deliverer.lastName}
            </h1>
            <p className="text-muted-foreground">{deliverer.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(deliverer.status)}
              {getVerificationBadge(deliverer.verificationStatus, deliverer.isVerified)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/deliverers/${deliverer.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
          {deliverer.status === 'ACTIVE' ? (
            <Button 
              variant="destructive" 
              onClick={handleSuspendDeliverer}
              disabled={updateDelivererStatusMutation.isPending}
            >
              <Ban className="mr-2 h-4 w-4" />
              Suspendre
            </Button>
          ) : (
            <Button 
              variant="default" 
              onClick={handleActivateDeliverer}
              disabled={updateDelivererStatusMutation.isPending}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Réactiver
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livraisons totales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliverer.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {deliverer.completedDeliveries} complétées ({getCompletionRate()}%)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {deliverer.rating.toFixed(1)}
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {deliverer.rating >= 4 ? 'Excellent service' : deliverer.rating >= 3 ? 'Bon service' : 'Service à améliorer'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains totaux</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEarnings(deliverer.earnings)}</div>
            <p className="text-xs text-muted-foreground">
              Depuis {formatDate(deliverer.createdAt)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zones couvertes</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliverer.preferredZones.length}</div>
            <p className="text-xs text-muted-foreground">
              {deliverer.preferredZones.join(', ')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenu détaillé */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du livreur</CardTitle>
          <CardDescription>
            Détails complets du profil de {deliverer.firstName} {deliverer.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Coordonnées</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nom complet</p>
                    <p className="text-sm text-muted-foreground">
                      {deliverer.firstName} {deliverer.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{deliverer.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Téléphone</p>
                    <p className="text-sm text-muted-foreground">{deliverer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Inscrit le</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(deliverer.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informations de livraison</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Véhicule</p>
                  <div className="flex items-center gap-2">
                    {deliverer.hasVehicle ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          Véhiculé
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {deliverer.vehicleType}
                        </span>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        À pied
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Zones préférées</p>
                  <div className="flex flex-wrap gap-1">
                    {deliverer.preferredZones.map((zone: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Taux de réussite</p>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {getCompletionRate()}% ({deliverer.completedDeliveries}/{deliverer.totalDeliveries})
                    </div>
                    {getCompletionRate() >= 90 ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        Excellent
                      </Badge>
                    ) : getCompletionRate() >= 70 ? (
                      <Badge variant="outline" className="text-xs">
                        Bon
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        À améliorer
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/verification/deliverer/${deliverer.id}`}>
                Voir les documents
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/deliverers/${deliverer.id}/deliveries`}>
                Historique des livraisons
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/messaging/deliverer/${deliverer.id}`}>
                Contacter le livreur
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/reports/deliverer/${deliverer.id}`}>
                Générer un rapport
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmation */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {dialogAction && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogAction.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialogAction.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={dialogAction.action}>Confirmer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
} 