'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, AlertCircle, Calendar, MapPin, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from '@/navigation';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/document-utils';

// Définir le type pour un itinéraire
type Route = {
  id: string;
  name: string;
  startAddress: string;
  endAddress: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  date: Date;
  isRecurring: boolean;
  recurringDays?: string[];
  isActive: boolean;
  createdAt: Date;
};

export default function DelivererRoutesPage() {
  useRoleProtection(['DELIVERER']);
  const t = useTranslations('routes');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Récupérer les routes du livreur
  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simuler un appel API pour l'instant
      // Dans une implémentation réelle, cela serait remplacé par un appel tRPC
      // const response = await api.delivererRoute.getMyRoutes.query();
      // setRoutes(response);

      // Simulation de données pour la maquette
      setTimeout(() => {
        const mockRoutes: Route[] = [
          {
            id: '1',
            name: 'Trajet domicile - travail',
            startAddress: '123 Rue de Paris, 75001 Paris',
            endAddress: '456 Avenue des Champs-Élysées, 75008 Paris',
            startLatitude: 48.856614,
            startLongitude: 2.352222,
            endLatitude: 48.873792,
            endLongitude: 2.295028,
            date: new Date(),
            isRecurring: true,
            recurringDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
            isActive: true,
            createdAt: new Date(),
          },
          {
            id: '2',
            name: 'Trajet weekend',
            startAddress: '123 Rue de Paris, 75001 Paris',
            endAddress: '789 Bd Saint-Germain, 75006 Paris',
            startLatitude: 48.856614,
            startLongitude: 2.352222,
            endLatitude: 48.853917,
            endLongitude: 2.338976,
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            isRecurring: false,
            isActive: true,
            createdAt: new Date(),
          },
        ];
        setRoutes(mockRoutes);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des itinéraires';
      setError(message);
      setIsLoading(false);
    }
  };

  // Supprimer un itinéraire
  const deleteRoute = async (routeId: string) => {
    try {
      setIsDeleting(true);

      // Simulation pour la maquette
      // Dans une implémentation réelle, cela serait remplacé par un appel tRPC
      // await api.delivererRoute.deleteRoute.mutate({ routeId });

      // Simuler la suppression
      setTimeout(() => {
        setRoutes(routes.filter(route => route.id !== routeId));
        toast.success(t('routeDeleted'));
        setIsDeleting(false);
        setRouteToDelete(null);
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la suppression de l'itinéraire";
      toast.error(message);
      setIsDeleting(false);
    }
  };

  // Charger les itinéraires au montage
  useEffect(() => {
    fetchRoutes();
  }, []);

  // Formater les jours récurrents pour l'affichage
  const formatRecurringDays = (days?: string[]) => {
    if (!days || days.length === 0) return '';

    const dayMap: Record<string, string> = {
      MONDAY: t('days.monday'),
      TUESDAY: t('days.tuesday'),
      WEDNESDAY: t('days.wednesday'),
      THURSDAY: t('days.thursday'),
      FRIDAY: t('days.friday'),
      SATURDAY: t('days.saturday'),
      SUNDAY: t('days.sunday'),
    };

    return days.map(day => dayMap[day] || day).join(', ');
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('myRoutes')}</h1>
          <p className="text-muted-foreground mt-1">{t('routesDescription')}</p>
        </div>

        <Button asChild>
          <Link href="/deliverer/my-routes/create">
            <Plus className="h-4 w-4 mr-2" />
            {t('addRoute')}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[250px] w-full rounded-lg" />
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-medium">{t('noRoutes')}</h3>
          <p className="text-muted-foreground mt-2">{t('addRoutePrompt')}</p>
          <Button asChild className="mt-4">
            <Link href="/deliverer/my-routes/create">{t('createFirstRoute')}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routes.map(route => (
            <Card key={route.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{route.name}</CardTitle>
                  <Badge variant={route.isActive ? 'default' : 'outline'}>
                    {route.isActive ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <CardDescription>
                  {route.isRecurring ? (
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      {t('recurring')}: {formatRecurringDays(route.recurringDays)}
                    </div>
                  ) : (
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      {t('oneTime')}: {formatDate(route.date)}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t('start')}</p>
                      <p className="text-sm text-muted-foreground">{route.startAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t('destination')}</p>
                      <p className="text-sm text-muted-foreground">{route.endAddress}</p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between pt-4">
                <Button variant="outline" size="sm" onClick={() => setRouteToDelete(route.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('delete')}
                </Button>

                <Button size="sm" asChild>
                  <Link href={`/deliverer/my-routes/${route.id}`}>
                    {t('details')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <Dialog open={!!routeToDelete} onOpenChange={open => !open && setRouteToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeletion')}</DialogTitle>
            <DialogDescription>{t('deletionWarning')}</DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRouteToDelete(null)} disabled={isDeleting}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => routeToDelete && deleteRoute(routeToDelete)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
