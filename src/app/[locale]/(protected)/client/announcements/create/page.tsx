'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAnnouncement, useClientAnnouncements } from '@/hooks/delivery/use-announcement';
import { AnnouncementForm } from '@/components/client/announcements/announcement-create-form';
import { CreateAnnouncementInput } from '@/schemas/delivery/announcement.schema';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/navigation';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';

export default function CreateAnnouncementPage() {
  useRoleProtection(['CLIENT']);
  const t = useTranslations('announcements');
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdAnnouncementId, setCreatedAnnouncementId] = useState<string | null>(null);

  const { createAnnouncement } = useAnnouncement();

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Vérifier que l'utilisateur est connecté
      if (!session?.user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Ajouter l'ID du client connecté et les champs manquants
      const dataWithClientId: CreateAnnouncementInput = {
        ...data,
        clientId: session.user.id,
        tags: [], // Ajouter tags vide par défaut
      };

      // Créer l'annonce via le hook
      const response = await createAnnouncement(dataWithClientId);

      if (response) {
        setSuccess(true);
        setCreatedAnnouncementId(response.id);

        // Notification de succès
        toast.success(t('createSuccess'), {
          description: t('announcementCreated'),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);

      // Notification d'erreur
      toast.error(t('createError'), {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si l'annonce a été créée avec succès, afficher un écran de confirmation
  if (success && createdAnnouncementId) {
    return (
      <div className="container py-10 max-w-3xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('createSuccess')}</CardTitle>
            <CardDescription>{t('announcementCreatedDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('nextStepsTitle')}</AlertTitle>
              <AlertDescription>{t('nextStepsDescription')}</AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/client/announcements">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToList')}
                </Link>
              </Button>

              <Button className="flex-1" asChild>
                <Link href={`/client/announcements/${createdAnnouncementId}`}>
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
          <h1 className="text-3xl font-bold tracking-tight">{t('createAnnouncement')}</h1>
          <p className="text-muted-foreground mt-1">{t('createAnnouncementDescription')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/client/announcements">
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
            <CardDescription>{t('fillAnnouncementDetails')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AnnouncementForm
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
