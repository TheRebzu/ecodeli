import { useTranslations } from 'next-intl';
import { User, VerificationStatus, DocumentType } from '@prisma/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VerificationStatusBadge } from './verification-status-badge';
import { CheckCircle2, AlertCircle, FileUp, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VerificationStatusPanelProps {
  status: {
    isVerified: boolean;
    pendingDocuments: boolean;
    rejectedDocuments: boolean;
    requiredDocuments: DocumentType[];
    uploadedDocuments: any[]; // Type simplifiée pour l'exemple
    missingDocuments: DocumentType[];
  };
  user: User;
  locale: string;
}

export function VerificationStatusPanel({ status, user, locale }: VerificationStatusPanelProps) {
  const t = useTranslations();
  const router = useRouter();

  const getVerificationStatus = (): VerificationStatus => {
    if (status.isVerified) {
      return VerificationStatus.APPROVED;
    } else if (status.rejectedDocuments) {
      return VerificationStatus.REJECTED;
    } else {
      return VerificationStatus.PENDING;
    }
  };

  const statusInfo = {
    [VerificationStatus.APPROVED]: {
      title: t('verification.status_approved_title'),
      description: t('verification.status_approved_description'),
      icon: CheckCircle2,
      iconClass: 'text-green-500',
      actionText: t('verification.view_documents'),
      actionPath: `/${locale}/${user.role.toLowerCase()}/documents`,
    },
    [VerificationStatus.PENDING]: {
      title: t('verification.status_pending_title'),
      description: t('verification.status_pending_description'),
      icon: Clock,
      iconClass: 'text-amber-500',
      actionText:
        status.missingDocuments.length > 0
          ? t('verification.upload_missing_documents')
          : t('verification.view_documents'),
      actionPath: `/${locale}/${user.role.toLowerCase()}/documents`,
    },
    [VerificationStatus.REJECTED]: {
      title: t('verification.status_rejected_title'),
      description: t('verification.status_rejected_description'),
      icon: AlertCircle,
      iconClass: 'text-red-500',
      actionText: t('verification.fix_rejected_documents'),
      actionPath: `/${locale}/${user.role.toLowerCase()}/documents`,
    },
  };

  const currentStatus = getVerificationStatus();
  const info = statusInfo[currentStatus];
  const Icon = info.icon;

  const getDocumentTypeName = (type: DocumentType) => {
    return t(`documents.types.${type.toLowerCase()}`);
  };

  const getUploadProgress = () => {
    const total = status.requiredDocuments.length;
    const uploaded = total - status.missingDocuments.length;
    return Math.round((uploaded / total) * 100);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${info.iconClass}`} />
            <CardTitle>{info.title}</CardTitle>
          </div>
          <VerificationStatusBadge status={currentStatus} />
        </div>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {status.missingDocuments.length > 0 && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1 text-sm font-medium">
                <span>{t('verification.document_upload_progress')}</span>
                <span>{getUploadProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${getUploadProgress()}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">{t('verification.missing_documents')}:</h4>
              <ul className="space-y-1.5">
                {status.missingDocuments.map(doc => (
                  <li key={doc} className="text-sm flex items-center gap-2">
                    <FileUp className="h-3.5 w-3.5 text-muted-foreground" />
                    {getDocumentTypeName(doc)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {status.rejectedDocuments && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex gap-2 items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm text-red-700">
                  {t('verification.rejected_documents_message')}
                </p>
              </div>
            </div>
          </div>
        )}

        {status.isVerified && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex gap-2 items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm text-green-700">{t('verification.verified_message')}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => router.push(info.actionPath)}
          className="w-full"
          variant={currentStatus === VerificationStatus.REJECTED ? 'destructive' : 'default'}
        >
          {info.actionText}
        </Button>
      </CardFooter>
    </Card>
  );
}
