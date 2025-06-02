'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { 
  FileText, 
  Upload, 
  Check, 
  X, 
  Clock,
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react';
import { DocumentType, VerificationStatus } from '@prisma/client';

interface ContractDocumentIntegrationProps {
  contractId: string;
  merchantId: string;
  userRole?: 'MERCHANT' | 'ADMIN';
}

const REQUIRED_CONTRACT_DOCUMENTS = [
  {
    type: DocumentType.BUSINESS_REGISTRATION,
    label: 'Extrait K-bis',
    description: 'Document officiel d\'enregistrement de l\'entreprise',
    required: true
  },
  {
    type: DocumentType.ID_CARD,
    label: 'Pièce d\'identité du dirigeant',
    description: 'Carte d\'identité ou passeport du représentant légal',
    required: true
  },
  {
    type: DocumentType.PROOF_OF_ADDRESS,
    label: 'Justificatif de domicile',
    description: 'Justificatif de l\'adresse du siège social',
    required: true
  },
  {
    type: DocumentType.VAT_REGISTRATION,
    label: 'Numéro de TVA intracommunautaire',
    description: 'Document d\'enregistrement à la TVA (si applicable)',
    required: false
  },
  {
    type: DocumentType.INSURANCE_CERTIFICATE,
    label: 'Attestation d\'assurance responsabilité civile',
    description: 'Couverture d\'assurance professionnelle',
    required: true
  }
];

const VERIFICATION_STATUS_CONFIG = {
  [VerificationStatus.PENDING]: {
    label: 'En attente',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-yellow-600'
  },
  [VerificationStatus.APPROVED]: {
    label: 'Approuvé',
    variant: 'default' as const,
    icon: Check,
    color: 'text-green-600'
  },
  [VerificationStatus.REJECTED]: {
    label: 'Rejeté',
    variant: 'destructive' as const,
    icon: X,
    color: 'text-red-600'
  }
};

export default function ContractDocumentIntegration({ 
  contractId, 
  merchantId, 
  userRole = 'MERCHANT' 
}: ContractDocumentIntegrationProps) {
  const { toast } = useToast();
  const [uploadingDocument, setUploadingDocument] = useState<DocumentType | null>(null);

  // Récupérer les documents existants du merchant
  const { data: documents, isLoading, refetch } = api.document.getUserDocuments.useQuery({
    userId: merchantId
  });

  // Mutation pour upload de document
  const uploadDocumentMutation = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      toast({
        title: 'Document téléchargé',
        description: 'Le document a été téléchargé avec succès et est en cours de vérification',
        variant: 'default'
      });
      setUploadingDocument(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur de téléchargement',
        description: error.message,
        variant: 'destructive'
      });
      setUploadingDocument(null);
    }
  });

  // Mutation pour vérification admin
  const verifyDocumentMutation = userRole === 'ADMIN' 
    ? api.document.verifyDocument.useMutation({
        onSuccess: () => {
          toast({
            title: 'Document vérifié',
            description: 'Le statut du document a été mis à jour',
            variant: 'default'
          });
          refetch();
        },
        onError: (error) => {
          toast({
            title: 'Erreur de vérification',
            description: error.message,
            variant: 'destructive'
          });
        }
      })
    : null;

  const handleFileUpload = async (documentType: DocumentType, file: File) => {
    if (!file) return;

    setUploadingDocument(documentType);

    // Créer FormData pour l'upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);
    formData.append('contractId', contractId);

    try {
      // En production, utiliser l'API d'upload de fichiers
      // Pour la démo, simuler l'upload
      const fileUrl = `/uploads/contracts/${contractId}/${file.name}`;
      
      await uploadDocumentMutation.mutateAsync({
        type: documentType,
        filename: file.name,
        fileUrl,
        mimeType: file.type,
        fileSize: file.size,
        notes: `Document requis pour le contrat ${contractId}`
      });
    } catch (error) {
      console.error('Erreur upload:', error);
    }
  };

  const handleVerifyDocument = (documentId: string, status: VerificationStatus, reason?: string) => {
    if (!verifyDocumentMutation) return;

    verifyDocumentMutation.mutate({
      documentId,
      verificationStatus: status,
      rejectionReason: reason
    });
  };

  const getDocumentForType = (documentType: DocumentType) => {
    return documents?.find(doc => doc.type === documentType);
  };

  const getDocumentStatusBadge = (document: any) => {
    if (!document) {
      return (
        <Badge variant="outline" className="text-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Manquant
        </Badge>
      );
    }

    const status = document.verificationStatus || document.status;
    const config = VERIFICATION_STATUS_CONFIG[status as VerificationStatus];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const calculateCompletionPercentage = () => {
    const requiredDocs = REQUIRED_CONTRACT_DOCUMENTS.filter(doc => doc.required);
    const approvedDocs = requiredDocs.filter(docType => {
      const doc = getDocumentForType(docType.type);
      return doc && (doc.verificationStatus === VerificationStatus.APPROVED || doc.status === 'APPROVED');
    });
    
    return Math.round((approvedDocs.length / requiredDocs.length) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();
  const allRequiredDocsApproved = completionPercentage === 100;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec progression */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents contractuels
            </CardTitle>
            <div className="text-right">
              <div className="text-2xl font-bold">{completionPercentage}%</div>
              <div className="text-sm text-muted-foreground">Complété</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barre de progression */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Statut global */}
            {allRequiredDocsApproved ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">
                  Tous les documents requis sont approuvés
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600">
                <Clock className="h-5 w-5" />
                <span className="font-medium">
                  Vérification des documents en cours
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <div className="grid gap-4">
        {REQUIRED_CONTRACT_DOCUMENTS.map((docRequirement) => {
          const document = getDocumentForType(docRequirement.type);
          const isUploading = uploadingDocument === docRequirement.type;

          return (
            <Card key={docRequirement.type} className="relative">
              {isUploading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded-lg">
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm mt-2">Téléchargement...</p>
                  </div>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{docRequirement.label}</CardTitle>
                      {docRequirement.required && (
                        <Badge variant="outline" className="text-red-600">
                          Requis
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {docRequirement.description}
                    </p>
                  </div>
                  {getDocumentStatusBadge(document)}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {document ? (
                  <div className="space-y-3">
                    {/* Informations du document */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-muted-foreground">Fichier</label>
                        <p>{document.filename}</p>
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground">Téléchargé le</label>
                        <p>{new Date(document.uploadedAt || document.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground">Taille</label>
                        <p>{Math.round((document.fileSize || 0) / 1024)} KB</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {document.fileUrl && (
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      )}

                      {document.fileUrl && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Télécharger
                        </Button>
                      )}

                      {userRole === 'MERCHANT' && 
                       (document.verificationStatus === VerificationStatus.REJECTED || 
                        document.status === 'REJECTED') && (
                        <div>
                          <input
                            type="file"
                            id={`file-${docRequirement.type}`}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(docRequirement.type, file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`file-${docRequirement.type}`)?.click()}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Remplacer
                          </Button>
                        </div>
                      )}

                      {userRole === 'ADMIN' && 
                       (document.verificationStatus === VerificationStatus.PENDING ||
                        document.status === 'PENDING') && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleVerifyDocument(document.id, VerificationStatus.APPROVED)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleVerifyDocument(document.id, VerificationStatus.REJECTED, 'Document non conforme')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Raison de rejet */}
                    {(document.verificationStatus === VerificationStatus.REJECTED ||
                      document.status === 'REJECTED') && 
                     document.rejectionReason && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Raison du rejet:</strong> {document.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Document manquant - interface d'upload
                  <div className="text-center py-6">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Ce document n'a pas encore été téléchargé
                    </p>
                    
                    {userRole === 'MERCHANT' && (
                      <div>
                        <input
                          type="file"
                          id={`file-upload-${docRequirement.type}`}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(docRequirement.type, file);
                          }}
                        />
                        <Button
                          onClick={() => 
                            document.getElementById(`file-upload-${docRequirement.type}`)?.click()
                          }
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Télécharger le document
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Résumé pour validation */}
      {userRole === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle>Validation contractuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Documents requis approuvés</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              
              {allRequiredDocsApproved ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">
                      Le merchant peut procéder à la signature du contrat
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      Vérification des documents en attente
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}