import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VerificationDetail } from '@/components/admin/verification/verification-detail';

interface VerificationDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: VerificationDetailPageProps): Promise<Metadata> {
  const t = await getTranslations('admin.verification');

  return {
    title: t('detail.metadata.title'),
    description: t('detail.metadata.description'),
  };
}

export default function VerificationDetailPage({ params }: VerificationDetailPageProps) {
  const { id } = params;

  return (
    <div className="container mx-auto py-8">
      <VerificationDetail verificationId={id} />
    </div>
  );
}
