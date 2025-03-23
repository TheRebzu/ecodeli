import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { notFound } from 'next/navigation';
import {
  ChevronLeftIcon,
  UserIcon,
  MailIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  ActivityIcon,
  PackageIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  BanIcon,
  PencilIcon,
} from 'lucide-react';
import { Status } from '@prisma/client';

import { getAdminUserDetails, updateUserStatus } from '@/lib/actions/admin-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Définir les types de stats selon les rôles
type UserStats = {
  shipmentCount?: number;
  deliveryCount?: number;
  productCount?: number;
  serviceCount?: number;
};

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const result = await getAdminUserDetails(params.id);
  
  if (!result) {
    notFound();
  }
  
  const { user, stats } = result;
  const userStats = stats as UserStats;
  
  // Formatter les dates
  const createdAtDate = format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: fr });
  const createdAtTime = format(new Date(user.createdAt), 'HH:mm', { locale: fr });
  const updatedAtDate = user.updatedAt ? format(new Date(user.updatedAt), 'dd MMMM yyyy', { locale: fr }) : '-';
  
  // Déterminer les actions disponibles en fonction du statut
  const renderStatusActions = () => {
    switch (user.status) {
      case 'PENDING':
        return (
          <>
            <StatusChangeAction 
              userId={user.id} 
              newStatus="APPROVED" 
              variant="success"
              title="Approuver l'utilisateur"
              description="Cette action activera le compte de l'utilisateur et lui donnera accès à la plateforme."
              icon={<CheckCircleIcon className="h-5 w-5 mr-2" />}
              actionLabel="Approuver"
            >
              Approuver
            </StatusChangeAction>
            <StatusChangeAction 
              userId={user.id} 
              newStatus="REJECTED" 
              variant="destructive"
              title="Rejeter l'utilisateur"
              description="Cette action refusera l'accès de l'utilisateur à la plateforme définitivement."
              icon={<BanIcon className="h-5 w-5 mr-2" />}
              actionLabel="Rejeter"
            >
              Rejeter
            </StatusChangeAction>
          </>
        );
      case 'APPROVED':
        return (
          <StatusChangeAction 
            userId={user.id} 
            newStatus="SUSPENDED" 
            variant="warning"
            title="Suspendre l'utilisateur"
            description="Cette action suspendra temporairement l'accès de l'utilisateur à la plateforme."
            icon={<AlertCircleIcon className="h-5 w-5 mr-2" />}
            actionLabel="Suspendre"
          >
            Suspendre
          </StatusChangeAction>
        );
      case 'SUSPENDED':
        return (
          <StatusChangeAction 
            userId={user.id} 
            newStatus="APPROVED" 
            variant="success"
            title="Réactiver l'utilisateur"
            description="Cette action réactivera l'accès de l'utilisateur à la plateforme."
            icon={<CheckCircleIcon className="h-5 w-5 mr-2" />}
            actionLabel="Réactiver"
          >
            Réactiver
          </StatusChangeAction>
        );
      default:
        return null;
    }
  };
  
  // Obtenir le style du badge de statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'secondary';
      case 'SUSPENDED':
        return 'destructive';
      case 'REJECTED':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  // Obtenir le texte du statut en français
  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Approuvé';
      case 'PENDING':
        return 'En attente';
      case 'SUSPENDED':
        return 'Suspendu';
      case 'REJECTED':
        return 'Rejeté';
      default:
        return status;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/admin/users">
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <PencilIcon className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          {renderStatusActions()}
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profil utilisateur</CardTitle>
            <CardDescription>Informations de base</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={user.image || ""} alt={user.name} />
              <AvatarFallback className="text-2xl bg-primary/10">
                <UserIcon className="h-12 w-12 text-primary" />
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-sm text-muted-foreground mb-4 flex items-center">
              <MailIcon className="h-3 w-3 mr-1" />
              {user.email}
            </p>
            <div className="flex flex-col gap-2 w-full mb-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Identifiant</span>
                <span className="text-sm font-medium">{user.id.substring(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Rôle</span>
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge variant={getStatusBadgeVariant(user.status)}>{getStatusText(user.status)}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Créé le</span>
                <span className="text-sm flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {createdAtDate}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">à</span>
                <span className="text-sm flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {createdAtTime}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Dernière MAJ</span>
                <span className="text-sm flex items-center">
                  {updatedAtDate !== '-' ? (
                    <>
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {updatedAtDate}
                    </>
                  ) : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="md:col-span-5 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
              <TabsTrigger value="details">Informations détaillées</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Résumé</CardTitle>
                  <CardDescription>Statistiques de l&apos;utilisateur</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {user.role === 'CLIENT' && (
                      <>
                        <StatCard 
                          title="Expéditions"
                          value={userStats.shipmentCount || 0}
                          icon={<PackageIcon className="h-5 w-5" />}
                          description="Total des expéditions"
                        />
                      </>
                    )}
                    
                    {user.role === 'COURIER' && (
                      <>
                        <StatCard 
                          title="Livraisons"
                          value={userStats.deliveryCount || 0}
                          icon={<PackageIcon className="h-5 w-5" />}
                          description="Total des livraisons"
                        />
                      </>
                    )}
                    
                    {user.role === 'MERCHANT' && (
                      <>
                        <StatCard 
                          title="Produits"
                          value={userStats.productCount || 0}
                          icon={<TagIcon className="h-5 w-5" />}
                          description="Total des produits"
                        />
                      </>
                    )}
                    
                    {user.role === 'PROVIDER' && (
                      <>
                        <StatCard 
                          title="Services"
                          value={userStats.serviceCount || 0}
                          icon={<ActivityIcon className="h-5 w-5" />}
                          description="Total des services"
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Informations spécifiques au rôle */}
              {user.role === 'CLIENT' && user.client && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div>
                        <h3 className="font-medium mb-2">Abonnement</h3>
                        <Badge variant={user.client.subscriptionPlan === 'PREMIUM' ? 'default' : 'outline'}>
                          {user.client.subscriptionPlan}
                        </Badge>
                        {user.client.subscriptionEnd && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Expire le: {format(new Date(user.client.subscriptionEnd), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {user.role === 'COURIER' && user.courier && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations livreur</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div>
                        <h3 className="font-medium mb-2">Véhicule</h3>
                        <p className="text-sm">{user.courier.vehicleType || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Zone de livraison</h3>
                        <p className="text-sm">Non spécifiée</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {user.role === 'MERCHANT' && user.merchant && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations commerçant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div>
                        <h3 className="font-medium mb-2">Boutique</h3>
                        <p className="text-sm">{user.merchant.companyName || 'Non spécifiée'}</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Type de commerce</h3>
                        <p className="text-sm">Non spécifié</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {user.role === 'PROVIDER' && user.provider && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations prestataire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div>
                        <h3 className="font-medium mb-2">Société</h3>
                        <p className="text-sm">Non spécifiée</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Type de service</h3>
                        <p className="text-sm">{user.provider.serviceTypes ? user.provider.serviceTypes.join(', ') : 'Non spécifié'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                  <CardDescription>Historique des actions de l&apos;utilisateur</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune activité récente à afficher.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Données brutes</CardTitle>
                  <CardDescription>Toutes les informations de l&apos;utilisateur</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[300px]">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Composant de carte statistique
function StatCard({ title, value, icon, description }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="flex flex-col p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="p-2 bg-primary/10 rounded-full">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// Composant pour les actions de changement de statut
function StatusChangeAction({ 
  userId, 
  newStatus, 
  variant,
  title,
  description,
  icon,
  actionLabel,
  children 
}: { 
  userId: string; 
  newStatus: string;
  variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "warning" | "success";
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  children: React.ReactNode;
}) {
  const handleStatusChange = updateUserStatus.bind(null, userId, newStatus as Status);
  
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm">
          {icon}
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={async () => {
              await handleStatusChange();
            }}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 