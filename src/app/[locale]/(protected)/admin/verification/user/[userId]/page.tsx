import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/server/db';
import { notFound } from 'next/navigation';
import { UserDocumentVerification } from '@/types/users/verification';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const t = await getTranslations('admin.verification');

  return {
    title: `${t('userVerification.title')} | Admin`,
    description: t('userVerification.description'),
  };
}

export default async function UserVerificationPage({ 
  params 
}: { 
  params: Promise<{ userId: string }> 
}) {
  const { userId } = await params;
  const t = await getTranslations('admin.verification');

  // Vérifier si l'utilisateur existe
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      documents: {
        orderBy: {
          uploadedAt: 'desc',
        },
      },
    },
  });

  // Rediriger vers 404 si l'utilisateur n'existe pas
  if (!user) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('userVerification.title')} - {user.name}
        </h1>
        <p className="text-muted-foreground mt-2">{t('userVerification.description')}</p>
      </div>

      <UserDocumentVerification user={user} documents={user.documents} />
    </div>
  );
}
