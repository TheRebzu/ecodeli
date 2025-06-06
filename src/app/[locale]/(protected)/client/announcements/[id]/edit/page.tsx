'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { useAnnouncement } from '@/hooks/delivery/use-announcement';
import AnnouncementForm from '@/components/ui/form';
import { UpdateAnnouncementInput } from '@/schemas/delivery/announcement.schema';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';

export default function EditAnnouncementPage() {
  useRoleProtection(['CLIENT']);
  const t = useTranslations('announcements');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    fetchAnnouncementById,
    updateAnnouncement,
    currentAnnouncement,
    isLoading,
    error: fetchError,
  } = useAnnouncement();

  // Récupérer les détails de l'annonce pour l'édition
  useEffect(() => {
    if (params.id) {
      fetchAnnouncementById(params.id);
    }
  }, [params.id, fetchAnnouncementById]);

  const handleSubmit = async (data: UpdateAnnouncementInput) => {
    if (!params.id) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Mettre à jour l'annonce via le hook
      const response = await updateAnnouncement(params.id, data);

      if (response) {
        setSuccess(true);

        // Notification de succès
        toast.success(t('updateSuccess'), {
          description: t('announcementUpdated'),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);

      // Notification d'erreur
      toast.error(t('updateError'), {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Afficher un skeleton loader pendant le chargement
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <Separator />

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
                <Skeleton className="h-32 w-full" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i + 3} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Afficher un message d'erreur si l'annonce n'est pas trouvée
  if (fetchError || !currentAnnouncement) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{fetchError || t('announcementNotFound')}</AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link href="/client/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToList')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Vérifier que l'annonce peut être modifiée (statuts valides: DRAFT, PUBLISHED, PENDING)
  const canEdit = ['DRAFT', 'PUBLISHED', 'PENDING'].includes(currentAnnouncement.status);

  if (!canEdit) {
    return (
      <div className="container py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('cannotEditTitle')}</AlertTitle>
          <AlertDescription>{t('cannotEditDescription')}</AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link href={`/client/announcements/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToDetails')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Si la mise à jour a réussi, afficher un écran de confirmation
  if (success) {
    return (
      <div className="container py-10 max-w-3xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('updateSuccess')}</CardTitle>
            <CardDescription>{t('announcementUpdatedDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/client/announcements">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToList')}
                </Link>
              </Button>

              <Button className="flex-1" asChild>
                <Link href={`/client/announcements/${params.id}`}>
                  {t('viewAnnouncement')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('editAnnouncement')}</h1>
          <p className="text-muted-foreground mt-1">{t('editAnnouncementDescription')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/client/announcements/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('announcementDetails')}</CardTitle>
            <CardDescription>{t('editAnnouncementInstructions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AnnouncementForm
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              defaultValues={currentAnnouncement}
              isEditMode={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
