'use client';

import { Announcement, AnnouncementStatus } from '@/types/announcement';
import { useAnnouncement } from '@/hooks/use-announcement';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  Edit,
  Eye,
  MapPin,
  MoreHorizontal,
  Package,
  Trash2,
  Truck,
  Euro,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

type AnnouncementCardProps = {
  announcement: Announcement;
  isClientView?: boolean;
  isDetailed?: boolean;
};

export function AnnouncementCard({
  announcement,
  isClientView = true,
  isDetailed = false,
}: AnnouncementCardProps) {
  const t = useTranslations('announcements');
  const router = useRouter();
  const {
    deleteAnnouncement,
    publishAnnouncement,
    getAnnouncementTypeLabel,
    getAnnouncementStatusLabel,
    getAnnouncementPriorityLabel,
  } = useAnnouncement();

  // État pour les boîtes de dialogue
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fonction pour naviguer vers la page de détail
  const viewDetails = () => {
    router.push(`/client/announcements/${announcement.id}`);
  };

  // Fonction pour naviguer vers la page de modification
  const editAnnouncement = () => {
    router.push(`/client/announcements/${announcement.id}/edit`);
  };

  // Récupérer la couleur du badge en fonction du statut
  const getStatusBadgeVariant = (status: AnnouncementStatus) => {
    switch (status) {
      case AnnouncementStatus.DRAFT:
        return 'secondary';
      case AnnouncementStatus.PENDING:
        return 'outline';
      case AnnouncementStatus.PUBLISHED:
        return 'default';
      case AnnouncementStatus.ASSIGNED:
        return 'blue';
      case AnnouncementStatus.IN_PROGRESS:
        return 'green';
      case AnnouncementStatus.COMPLETED:
        return 'success';
      case AnnouncementStatus.CANCELLED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Récupérer l'icône en fonction du statut
  const getStatusIcon = (status: AnnouncementStatus) => {
    switch (status) {
      case AnnouncementStatus.COMPLETED:
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      case AnnouncementStatus.CANCELLED:
        return <AlertCircle className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  // Vérifier si l'annonce est modifiable par le client
  const isEditable =
    isClientView &&
    (announcement.status === AnnouncementStatus.DRAFT ||
      announcement.status === AnnouncementStatus.PENDING);

  // Vérifier si l'annonce est publiable par le client
  const isPublishable =
    isClientView &&
    (announcement.status === AnnouncementStatus.DRAFT ||
      announcement.status === AnnouncementStatus.PENDING);

  // Vérifier si l'annonce est supprimable par le client
  const isDeletable =
    isClientView &&
    (announcement.status === AnnouncementStatus.DRAFT ||
      announcement.status === AnnouncementStatus.PENDING ||
      announcement.status === AnnouncementStatus.PUBLISHED);

  // Action de publication
  const handlePublish = () => {
    publishAnnouncement(announcement.id);
  };

  // Action de suppression
  const handleDelete = () => {
    deleteAnnouncement(announcement.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <Card className={cn('w-full transition-all hover:shadow-md', isDetailed && 'shadow-md')}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="flex items-center">
              <Badge variant="outline" className="mr-2">
                {getAnnouncementTypeLabel(announcement.type)}
              </Badge>
              {announcement.title}
            </CardTitle>
            <CardDescription>
              {t('createdAt')}: {format(new Date(announcement.createdAt), 'PPP', { locale: fr })}
              {announcement.updatedAt !== announcement.createdAt &&
                ` · ${t('updatedAt')}: ${format(new Date(announcement.updatedAt), 'PPP', { locale: fr })}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(announcement.status)}>
              {getStatusIcon(announcement.status)}
              {getAnnouncementStatusLabel(announcement.status)}
            </Badge>

            {/* Menu d'actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={viewDetails}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('viewDetails')}
                </DropdownMenuItem>

                {isEditable && (
                  <DropdownMenuItem onClick={editAnnouncement}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('edit')}
                  </DropdownMenuItem>
                )}

                {isPublishable && (
                  <DropdownMenuItem onClick={handlePublish}>
                    <Truck className="mr-2 h-4 w-4" />
                    {t('publish')}
                  </DropdownMenuItem>
                )}

                {isDeletable && (
                  <>
                    <DropdownMenuSeparator />
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={e => e.preventDefault()}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('deleteConfirmation')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('deleteWarning')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                            {t('delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {/* Adresses */}
            <div className="flex items-start">
              <MapPin className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
              <div className="text-sm">
                <div>
                  <span className="font-medium">{t('pickupAddress')}: </span>{' '}
                  {announcement.pickupAddress}
                </div>
                <div>
                  <span className="font-medium">{t('deliveryAddress')}: </span>{' '}
                  {announcement.deliveryAddress}
                </div>
              </div>
            </div>

            {/* Dates */}
            {(announcement.pickupDate || announcement.deliveryDate) && (
              <div className="flex items-start">
                <Calendar className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div className="text-sm">
                  {announcement.pickupDate && (
                    <div>
                      <span className="font-medium">{t('pickupDate')}: </span>
                      {format(new Date(announcement.pickupDate), 'PPP', { locale: fr })}
                      {announcement.pickupTimeWindow && ` (${announcement.pickupTimeWindow})`}
                    </div>
                  )}
                  {announcement.deliveryDate && (
                    <div>
                      <span className="font-medium">{t('deliveryDate')}: </span>
                      {format(new Date(announcement.deliveryDate), 'PPP', { locale: fr })}
                      {announcement.deliveryTimeWindow && ` (${announcement.deliveryTimeWindow})`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {/* Détails du colis */}
            {(announcement.weight ||
              announcement.width ||
              announcement.height ||
              announcement.length) && (
              <div className="flex items-start">
                <Package className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div className="text-sm">
                  {announcement.weight && (
                    <div>
                      <span className="font-medium">{t('weight')}: </span> {announcement.weight} kg
                    </div>
                  )}
                  {(announcement.width || announcement.height || announcement.length) && (
                    <div>
                      <span className="font-medium">{t('dimensions')}: </span>
                      {announcement.width || '?'} × {announcement.height || '?'} ×{' '}
                      {announcement.length || '?'} cm
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prix */}
            <div className="flex items-start">
              <Euro className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
              <div className="text-sm">
                <div>
                  <span className="font-medium">{t('suggestedPrice')}: </span>
                  {announcement.suggestedPrice
                    ? `${announcement.suggestedPrice} €`
                    : t('notSpecified')}
                  {announcement.isNegotiable && ` (${t('negotiable')})`}
                </div>
                {announcement.finalPrice && (
                  <div>
                    <span className="font-medium">{t('finalPrice')}: </span>
                    {announcement.finalPrice} €
                  </div>
                )}
              </div>
            </div>

            {/* Urgence et flexibilité */}
            <div className="flex items-start">
              <Clock className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
              <div className="text-sm">
                <div>
                  <span className="font-medium">{t('priority')}: </span>{' '}
                  {getAnnouncementPriorityLabel(announcement.priority)}
                </div>
                <div>
                  <span className="font-medium">{t('flexibility')}: </span>{' '}
                  {announcement.isFlexible ? t('flexible') : t('notFlexible')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description (visible uniquement en mode détaillé ou si demandé explicitement) */}
        {isDetailed && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h4 className="font-medium">{t('description')}</h4>
              <p className="text-sm text-muted-foreground">{announcement.description}</p>

              {/* Caractéristiques spéciales */}
              {(announcement.isFragile || announcement.needsCooling) && (
                <div className="flex gap-2 mt-2">
                  {announcement.isFragile && <Badge variant="secondary">{t('fragile')}</Badge>}
                  {announcement.needsCooling && (
                    <Badge variant="secondary">{t('needsCooling')}</Badge>
                  )}
                </div>
              )}

              {/* Notes */}
              {announcement.notes && (
                <>
                  <h4 className="font-medium mt-4">{t('notes')}</h4>
                  <p className="text-sm text-muted-foreground">{announcement.notes}</p>
                </>
              )}

              {/* Tags */}
              {announcement.tags && announcement.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {announcement.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-end pt-2">
        {!isDetailed && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={viewDetails}>
              <Eye className="mr-2 h-4 w-4" />
              {t('viewDetails')}
            </Button>

            {isEditable && (
              <Button variant="outline" size="sm" onClick={editAnnouncement}>
                <Edit className="mr-2 h-4 w-4" />
                {t('edit')}
              </Button>
            )}

            {isPublishable && (
              <Button size="sm" onClick={handlePublish}>
                <Truck className="mr-2 h-4 w-4" />
                {t('publish')}
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
