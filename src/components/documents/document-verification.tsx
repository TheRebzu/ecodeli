import { useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Textarea } from '~/components/ui/textarea';
import { useToast } from '~/components/ui/use-toast';
import { useDocuments } from '~/hooks/use-documents';
import { Badge } from '~/components/ui/badge';
import { FileIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDate } from '~/lib/utils';
import { useTranslations } from 'next-intl';
import type { Document, Verification, User } from '@prisma/client';

type DocumentWithVerifications = Document & {
  verifications: (Verification & {
    submitter: {
      id: string;
      name: string;
      email: string;
    };
    verifier?: {
      id: string;
      name: string;
      email: string;
    } | null;
  })[];
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type DocumentVerificationProps = {
  document: DocumentWithVerifications;
  isAdmin?: boolean;
};

export function DocumentVerification({ document, isAdmin = false }: DocumentVerificationProps) {
  const t = useTranslations('documents');
  const { toast } = useToast();
  const { updateVerification, isLoading } = useDocuments();
  const [notes, setNotes] = useState('');

  const pendingVerification = document.verifications.find(v => v.status === 'PENDING');

  const handleApprove = async () => {
    if (!pendingVerification) return;

    const success = await updateVerification(pendingVerification.id, 'APPROVED', notes);

    if (success) {
      toast({
        title: t('verification.approvedTitle'),
        description: t('verification.approvedDescription'),
      });
    }
  };

  const handleReject = async () => {
    if (!pendingVerification) return;

    const success = await updateVerification(pendingVerification.id, 'REJECTED', notes);

    if (success) {
      toast({
        title: t('verification.rejectedTitle'),
        description: t('verification.rejectedDescription'),
      });
    }
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {t('verification.approved')}
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> {t('verification.rejected')}
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <Clock className="w-3 h-3 mr-1" /> {t('verification.pending')}
          </Badge>
        );
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'ID_CARD':
        return t('types.idCard');
      case 'DRIVING_LICENSE':
        return t('types.drivingLicense');
      case 'VEHICLE_REGISTRATION':
        return t('types.vehicleRegistration');
      case 'INSURANCE':
        return t('types.insurance');
      case 'QUALIFICATION_CERTIFICATE':
        return t('types.qualificationCertificate');
      case 'OTHER':
      default:
        return t('types.other');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileIcon className="mr-2 h-5 w-5" />
          {getDocumentTypeLabel(document.type)}
        </CardTitle>
        <CardDescription>
          {t('uploaded')}: {formatDate(document.uploadedAt)}
          {document.expiryDate && (
            <>
              {' '}
              • {t('expires')}: {formatDate(document.expiryDate)}
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('filename')}: {document.filename}
          </span>
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {t('view')}
          </a>
        </div>

        {document.notes && (
          <div>
            <h4 className="text-sm font-medium mb-1">{t('notes')}:</h4>
            <p className="text-sm text-muted-foreground">{document.notes}</p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-1">{t('submittedBy')}:</h4>
          <p className="text-sm">
            {document.user.name} ({document.user.email})
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {t(`roles.${document.user.role.toLowerCase()}`)}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-1">{t('verificationStatus')}:</h4>
          <div className="flex flex-wrap gap-2">
            {document.verifications.length > 0 ? (
              document.verifications.map(verification => (
                <div key={verification.id} className="flex flex-col gap-1">
                  {getVerificationStatusBadge(verification.status)}
                  {verification.verifiedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(verification.verifiedAt)}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {t('verification.noVerifications')}
              </span>
            )}
          </div>
        </div>

        {isAdmin && pendingVerification && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('verification.addNotes')}:</h4>
            <Textarea
              placeholder={t('verification.notesPlaceholder')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        )}
      </CardContent>

      {isAdmin && pendingVerification && (
        <CardFooter className="flex justify-between space-x-2">
          <Button variant="outline" onClick={handleReject} disabled={isLoading} className="flex-1">
            <XCircle className="w-4 h-4 mr-2" />
            {t('verification.reject')}
          </Button>
          <Button onClick={handleApprove} disabled={isLoading} className="flex-1">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {t('verification.approve')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
