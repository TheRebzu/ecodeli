'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { api } from '@/trpc/react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  FileCheck,
  Shield
} from 'lucide-react';

export default function DocumentVerificationStatus() {
  const { data: verificationStatus } = api.delivery.verification.getDelivererStatus.useQuery();

  if (!verificationStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-muted-foreground">Chargement du statut...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getOverallStatus = () => {
    const status = verificationStatus.overallStatus;
    switch (status) {
      case 'APPROVED':
        return {
          icon: <Shield className="h-6 w-6 text-green-500" />,
          title: 'Compte vérifié',
          description: 'Tous vos documents ont été approuvés. Vous pouvez maintenant accepter des livraisons.',
          variant: 'success' as const,
          color: 'text-green-600'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          title: 'Vérification échouée',
          description: 'Certains documents ont été rejetés. Veuillez les corriger et les re-soumettre.',
          variant: 'destructive' as const,
          color: 'text-red-600'
        };
      case 'PENDING':
        return {
          icon: <Clock className="h-6 w-6 text-yellow-500" />,
          title: 'Vérification en cours',
          description: 'Vos documents sont en cours d\'examen par notre équipe.',
          variant: 'default' as const,
          color: 'text-yellow-600'
        };
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-gray-500" />,
          title: 'Documents requis',
          description: 'Veuillez soumettre tous les documents requis pour commencer la vérification.',
          variant: 'default' as const,
          color: 'text-gray-600'
        };
    }
  };

  const statusInfo = getOverallStatus();
  
  const totalDocuments = verificationStatus.applications?.[0]?.requiredDocuments?.length || 0;
  const approvedDocuments = verificationStatus.applications?.[0]?.requiredDocuments?.filter(
    (doc: any) => doc.status === 'APPROVED'
  ).length || 0;
  
  const progressPercentage = totalDocuments > 0 ? (approvedDocuments / totalDocuments) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Statut de vérification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${statusInfo.color}`}>
                {statusInfo.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {statusInfo.description}
              </p>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Documents vérifiés</span>
                  <span className="text-sm text-muted-foreground">
                    {approvedDocuments}/{totalDocuments}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Status */}
      {verificationStatus.applications?.[0]?.requiredDocuments && (
        <Card>
          <CardHeader>
            <CardTitle>Détail des documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verificationStatus.applications[0].requiredDocuments.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {doc.status === 'APPROVED' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {doc.status === 'REJECTED' && <XCircle className="h-4 w-4 text-red-500" />}
                    {doc.status === 'PENDING' && <Clock className="h-4 w-4 text-yellow-500" />}
                    
                    <div>
                      <p className="font-medium">{doc.documentType}</p>
                      {doc.uploadedAt && (
                        <p className="text-sm text-muted-foreground">
                          Uploadé le {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                      {doc.rejectionReason && (
                        <p className="text-sm text-red-600">
                          {doc.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    {doc.status === 'APPROVED' && (
                      <Badge variant="success">Approuvé</Badge>
                    )}
                    {doc.status === 'REJECTED' && (
                      <Badge variant="destructive">Rejeté</Badge>
                    )}
                    {doc.status === 'PENDING' && (
                      <Badge variant="secondary">En attente</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Alerts */}
      {verificationStatus.overallStatus === 'REJECTED' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Des documents ont été rejetés. Veuillez consulter les raisons ci-dessus et soumettre de nouveaux documents.
          </AlertDescription>
        </Alert>
      )}

      {verificationStatus.overallStatus === 'PENDING' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Vos documents sont en cours d'examen. Ce processus peut prendre 1-3 jours ouvrables.
          </AlertDescription>
        </Alert>
      )}

      {verificationStatus.overallStatus === 'APPROVED' && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Félicitations ! Votre compte est maintenant vérifié et vous pouvez commencer à accepter des livraisons.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}