'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { 
  Shield, 
  FileCheck, 
  AlertTriangle, 
  Upload, 
  RefreshCcw,
  Eye,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Camera,
  Scan
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentVerificationProps {
  delivererId?: string;
  onStatusChange?: (status: string) => void;
}

export default function DelivererDocumentVerification({ 
  delivererId, 
  onStatusChange 
}: DocumentVerificationProps) {
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Queries
  const { data: verificationStatus, refetch } = api.deliverer.documents.getAll.useQuery(
    { delivererId },
    { refetchInterval: 30000 } // Actualisation toutes les 30s
  );

  const { data: verificationHistory } = api.delivery.verification.getDocumentHistory.useQuery(
    { documentId: selectedDocument?.id },
    { enabled: !!selectedDocument?.id }
  );

  // Mutations
  const autoValidateMutation = api.deliverer.documents.autoValidate.useMutation({
    onSuccess: (result) => {
      toast({
        title: 'Validation automatique lancée',
        description: result.status === 'APPROVED' 
          ? 'Document validé automatiquement !' 
          : 'Le document nécessite une vérification manuelle',
        variant: result.status === 'APPROVED' ? 'success' : 'default'
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur de validation',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const uploadMutation = api.deliverer.documents.upload.useMutation({
    onSuccess: () => {
      toast({
        title: 'Document uploadé',
        description: 'Votre document a été envoyé pour vérification',
        variant: 'success'
      });
      setUploadingDocType(null);
      refetch();
      onStatusChange?.('UPLOADED');
    },
    onError: (error) => {
      toast({
        title: 'Erreur d\'upload',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejeté</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>;
      default:
        return <Badge variant="outline">À soumettre</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'IDENTITY': 'Pièce d\'identité',
      'DRIVING_LICENSE': 'Permis de conduire',
      'INSURANCE': 'Attestation d\'assurance',
      'VEHICLE_REGISTRATION': 'Carte grise',
      'BACKGROUND_CHECK': 'Extrait de casier judiciaire',
      'MEDICAL_CERTIFICATE': 'Certificat médical',
      'BANK_DETAILS': 'RIB',
      'ADDRESS_PROOF': 'Justificatif de domicile'
    };
    return labels[type] || type;
  };

  const isDocumentExpiring = (expiryDate?: Date) => {
    if (!expiryDate) return false;
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 30); // 30 jours avant expiration
    return expiryDate <= warningDate && expiryDate > now;
  };

  const isDocumentExpired = (expiryDate?: Date) => {
    if (!expiryDate) return false;
    return expiryDate <= new Date();
  };

  if (!verificationStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-muted-foreground">Chargement des documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const documents = verificationStatus.documents || [];
  const approvedCount = documents.filter((doc: any) => doc.status === 'APPROVED').length;
  const pendingCount = documents.filter((doc: any) => doc.status === 'PENDING').length;
  const rejectedCount = documents.filter((doc: any) => doc.status === 'REJECTED').length;
  const expiringCount = documents.filter((doc: any) => isDocumentExpiring(doc.expiryDate)).length;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                <div className="text-sm text-muted-foreground">Approuvés</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                <div className="text-sm text-muted-foreground">Rejetés</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{expiringCount}</div>
                <div className="text-sm text-muted-foreground">Expirent bientôt</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {rejectedCount > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {rejectedCount} document(s) ont été rejeté(s). Veuillez les corriger et les re-soumettre.
          </AlertDescription>
        </Alert>
      )}

      {expiringCount > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Calendar className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {expiringCount} document(s) expirent dans moins de 30 jours. Pensez à les renouveler.
          </AlertDescription>
        </Alert>
      )}

      {/* Documents List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tous ({documents.length})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved">Approuvés ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejected">Rejetés ({rejectedCount})</TabsTrigger>
        </TabsList>

        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {documents
              .filter((doc: any) => {
                if (tab === 'all') return true;
                return doc.status.toLowerCase() === tab;
              })
              .map((document: any) => (
                <Card key={document.id} className={isDocumentExpired(document.expiryDate) ? 'border-red-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(document.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{getDocumentTypeLabel(document.documentType)}</h3>
                            {isDocumentExpired(document.expiryDate) && (
                              <Badge variant="destructive" className="text-xs">Expiré</Badge>
                            )}
                            {isDocumentExpiring(document.expiryDate) && !isDocumentExpired(document.expiryDate) && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">Expire bientôt</Badge>
                            )}
                          </div>
                          
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Version {document.version}</span>
                              {document.uploadedAt && (
                                <span>Uploadé le {format(new Date(document.uploadedAt), 'dd/MM/yyyy', { locale: fr })}</span>
                              )}
                              {document.verifiedAt && document.status === 'APPROVED' && (
                                <span className="text-green-600">
                                  Approuvé le {format(new Date(document.verifiedAt), 'dd/MM/yyyy', { locale: fr })}
                                </span>
                              )}
                            </div>
                            
                            {document.expiryDate && (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                <span className={isDocumentExpired(document.expiryDate) ? 'text-red-600' : isDocumentExpiring(document.expiryDate) ? 'text-orange-600' : 'text-muted-foreground'}>
                                  Expire le {format(new Date(document.expiryDate), 'dd/MM/yyyy', { locale: fr })}
                                </span>
                              </div>
                            )}

                            {document.autoValidated && (
                              <div className="flex items-center gap-1 text-sm text-blue-600">
                                <Scan className="h-3 w-3" />
                                <span>Validé automatiquement (Score: {Math.round(document.validationScore || 0)}%)</span>
                              </div>
                            )}

                            {document.rejectionReason && (
                              <div className="text-sm text-red-600">
                                <strong>Raison du rejet:</strong> {document.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(document.status)}
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {document.documentUrl && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedDocument(document)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    {getDocumentTypeLabel(document.documentType)} - Version {document.version}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {/* Document Preview */}
                                  {document.mimeType?.includes('image') ? (
                                    <img 
                                      src={document.documentUrl} 
                                      alt={`Document ${document.documentType}`}
                                      className="w-full h-auto rounded-lg border"
                                    />
                                  ) : (
                                    <iframe 
                                      src={document.documentUrl} 
                                      className="w-full h-96 rounded-lg border"
                                      title={`Document ${document.documentType}`}
                                    />
                                  )}
                                  
                                  {/* Document Info */}
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <strong>Type:</strong> {document.mimeType}
                                    </div>
                                    <div>
                                      <strong>Taille:</strong> {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                                    </div>
                                    <div>
                                      <strong>Checksum:</strong> {document.checksum || 'N/A'}
                                    </div>
                                    <div>
                                      <strong>Statut:</strong> {getStatusBadge(document.status)}
                                    </div>
                                  </div>

                                  {/* Validation History */}
                                  {verificationHistory?.auditLogs && verificationHistory.auditLogs.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Historique des validations</h4>
                                      <div className="space-y-2">
                                        {verificationHistory.auditLogs.map((log: any) => (
                                          <div key={log.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                                            <div className="flex-1">
                                              <div className="font-medium">{log.actionType}</div>
                                              <div className="text-muted-foreground">{log.notes}</div>
                                            </div>
                                            <div className="text-right">
                                              <div>{log.actor?.profile?.firstName} {log.actor?.profile?.lastName}</div>
                                              <div className="text-muted-foreground">
                                                {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {document.documentUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(document.documentUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}

                          {document.status === 'PENDING' && !document.autoValidated && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => autoValidateMutation.mutate({ documentId: document.id })}
                              disabled={autoValidateMutation.isPending}
                            >
                              <Scan className="h-4 w-4" />
                            </Button>
                          )}

                          {(document.status === 'REJECTED' || isDocumentExpired(document.expiryDate)) && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => setUploadingDocType(document.documentType)}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {documents.filter((doc: any) => {
              if (tab === 'all') return true;
              return doc.status.toLowerCase() === tab;
            }).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">
                    Aucun document {tab === 'all' ? '' : tab}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tab === 'all' 
                      ? 'Vous n\'avez pas encore uploadé de documents.' 
                      : `Aucun document ${tab} pour le moment.`}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload Modal would go here */}
      {uploadingDocType && (
        <Dialog open={!!uploadingDocType} onOpenChange={() => setUploadingDocType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Uploader - {getDocumentTypeLabel(uploadingDocType)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  Assurez-vous que le document est lisible, bien éclairé et que toutes les informations sont visibles.
                </AlertDescription>
              </Alert>
              
              {/* File upload component would go here */}
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Glissez votre document ici ou cliquez pour sélectionner
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setUploadingDocType(null)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Upload...' : 'Uploader'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}