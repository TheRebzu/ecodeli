'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  Check,
  X,
  FileText,
  Image as ImageIcon,
  File,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Mail,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '@/trpc/react';

// Types pour les documents et utilisateurs
interface Document {
  id: string;
  type: string;
  filename: string;
  fileUrl: string;
  mimeType: string;
  uploadedAt: Date;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
}

interface UserWithDocuments {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  documents: Document[];
  phoneNumber?: string | null;
}

// Mappings pour afficher les noms compréhensibles des types de documents
const documentTypeLabels: Record<string, string> = {
  ID_CARD: "Carte d'identité",
  DRIVING_LICENSE: 'Permis de conduire',
  VEHICLE_REGISTRATION: 'Carte grise',
  INSURANCE: 'Assurance',
  QUALIFICATION_CERTIFICATE: 'Certificat de qualification',
  PROOF_OF_ADDRESS: 'Justificatif de domicile',
  BUSINESS_REGISTRATION: 'Registre du commerce',
  SELFIE: 'Selfie',
  OTHER: 'Autre document',
};

export function UserDocumentVerification({
  user,
  documents,
}: {
  user: UserWithDocuments;
  documents: Document[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Use useEffect to mark when component is mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Improved URL handling function that avoids hydration mismatches
  const getFullDocumentUrl = (url: string): string => {
    // If not mounted yet (server-side or first render), return the original URL to avoid hydration mismatch
    if (!mounted) {
      return url;
    }

    // Client-side only logic after hydration
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Ensure the URL is properly formatted
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }

    return `${window.location.origin}/${url}`;
  };

  // Function to safely view a document without navigation issues
  const viewDocument = (document: Document) => {
    setSelectedDocument(document);
    setDocumentViewerOpen(true);
  };

  // Function to close the document viewer
  const closeDocumentViewer = () => {
    setDocumentViewerOpen(false);
    setSelectedDocument(null);
  };

  // Fonction pour télécharger un document correctement
  const downloadDocument = async (doc: Document) => {
    try {
      toast({
        title: 'Téléchargement en cours',
        children: 'Préparation du document...',
      });

      // Construire l'URL complète pour le téléchargement
      const downloadUrl = getFullDocumentUrl(doc.fileUrl);
      
      // Créer un élément de lien temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Extraire le nom original du fichier
      const originalFilename = doc.filename;
      // Utiliser le nom original ou générer un nom basé sur le type de document
      const fileName = originalFilename || `${documentTypeLabels[doc.type] || doc.type}.${doc.mimeType?.split('/').pop() || 'pdf'}`;
      link.setAttribute('download', fileName);
      
      // Cliquer sur le lien pour déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      toast({
        title: 'Téléchargement lancé',
        children: 'Le document est en cours de téléchargement.',
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: 'Erreur de téléchargement',
        variant: 'destructive',
        children: 'Impossible de télécharger le document. Veuillez réessayer.',
      });
    }
  };

  // Regrouper les documents par type
  const documentsByType: Record<string, Document> = {};
  documents.forEach(doc => {
    documentsByType[doc.type] = doc;
  });

  // Utiliser la mutation pour approuver un document
  const approveDocument = api.verification.approveDocument.useMutation({
    onSuccess: () => {
      toast({
        title: 'Document approuvé',
        children: 'Le document a été approuvé avec succès.',
      });
      router.refresh();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        children: `Impossible d'approuver le document: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Utiliser la mutation pour rejeter un document
  const rejectDocument = api.verification.rejectDocument.useMutation({
    onSuccess: () => {
      toast({
        title: 'Document rejeté',
        children: 'Le document a été rejeté avec succès.',
      });
      setRejectionReason('');
      router.refresh();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        children: `Impossible de rejeter le document: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Déterminer quels documents sont requis en fonction du rôle
  const getRequiredDocumentTypes = (role: string): string[] => {
    switch (role) {
      case 'DELIVERER':
        return ['ID_CARD', 'DRIVING_LICENSE', 'SELFIE'];
      case 'MERCHANT':
        return ['ID_CARD', 'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS'];
      case 'PROVIDER':
        return ['ID_CARD', 'QUALIFICATION_CERTIFICATE', 'PROOF_OF_ADDRESS'];
      default:
        return [];
    }
  };

  const requiredDocuments = getRequiredDocumentTypes(user.role);

  // Handler pour approuver un document
  const handleApprove = (documentId: string) => {
    approveDocument.mutate({ documentId });
  };

  // Handler pour rejeter un document
  const handleReject = (documentId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Erreur',
        children: 'Veuillez fournir une raison pour le rejet du document.',
        variant: 'destructive',
      });
      return;
    }

    rejectDocument.mutate({
      documentId,
      reason: rejectionReason,
    });
  };

  // Déterminer si tous les documents requis sont approuvés
  const allRequiredDocumentsApproved = requiredDocuments.every(type => {
    const doc = documentsByType[type];
    return doc && doc.verificationStatus === 'APPROVED';
  });

  // Générer l'avatar de l'utilisateur
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('');
  };

  return (
    <div className="space-y-6">
      {/* Header avec information utilisateur */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : (
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Mail className="w-3 h-3" /> {user.email}
                {user.phoneNumber && (
                  <>
                    <span className="mx-1">•</span>
                    <Phone className="w-3 h-3" /> {user.phoneNumber}
                  </>
                )}
              </CardDescription>
            </div>
            <div className="ml-auto">
              <Badge
                variant={
                  user.role === 'DELIVERER'
                    ? 'secondary'
                    : user.role === 'MERCHANT'
                      ? 'outline'
                      : 'default'
                }
              >
                {user.role === 'DELIVERER'
                  ? 'Livreur'
                  : user.role === 'MERCHANT'
                    ? 'Commerçant'
                    : 'Prestataire'}
              </Badge>
              {allRequiredDocumentsApproved ? (
                <Badge variant="success" className="ml-2">
                  Vérifié
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-2">
                  Non vérifié
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2 pt-0">
          <div className="text-sm text-muted-foreground">
            Documents requis: {requiredDocuments.map(type => documentTypeLabels[type]).join(', ')}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
        </CardFooter>
      </Card>

      {/* Documents à vérifier */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requiredDocuments.map(docType => {
          const document = documentsByType[docType];
          const isPending = document?.verificationStatus === 'PENDING';
          const isApproved = document?.verificationStatus === 'APPROVED';
          const isRejected = document?.verificationStatus === 'REJECTED';

          return (
            <Card
              key={docType}
              className={
                isApproved
                  ? 'border-green-200 bg-green-50/50'
                  : isRejected
                    ? 'border-red-200 bg-red-50/50'
                    : document
                      ? ''
                      : 'border-dashed border-muted-foreground/20'
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    {documentTypeLabels[docType]}
                  </CardTitle>
                  {document && (
                    <Badge
                      variant={isApproved ? 'success' : isRejected ? 'destructive' : 'outline'}
                    >
                      {isApproved && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {isRejected && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {isPending && <Clock className="mr-1 h-3 w-3" />}
                      {isApproved ? 'Approuvé' : isRejected ? 'Rejeté' : 'En attente'}
                    </Badge>
                  )}
                </div>
                {document && (
                  <CardDescription>
                    Soumis le {format(new Date(document.uploadedAt), 'PPP', { locale: fr })}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent>
                {document ? (
                  <div className="space-y-4">
                    {document.mimeType.startsWith('image/') ? (
                      <div
                        className="relative aspect-[4/3] overflow-hidden rounded-lg border cursor-pointer"
                        onClick={() => viewDocument(document)}
                      >
                        {/* Only render image when client-side */}
                        {mounted && (
                          <img
                            src={getFullDocumentUrl(document.fileUrl)}
                            alt={document.filename}
                            className="object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center h-32 bg-muted rounded-lg cursor-pointer"
                        onClick={() => viewDocument(document)}
                      >
                        <FileText className="h-10 w-10 text-muted-foreground" />
                        <button className="mt-2 text-sm text-primary">Voir le document</button>
                      </div>
                    )}

                    {isRejected && document.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <div className="font-medium mb-1">Raison du rejet:</div>
                        <div>{document.rejectionReason}</div>
                      </div>
                    )}

                    {isPending && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Raison du rejet (obligatoire en cas de rejet)"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                        />
                      </div>
                    )}

                    <Button variant="outline" size="sm" onClick={() => downloadDocument(document)}>
                      Télécharger
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 bg-muted/20 rounded-lg border border-dashed">
                    <File className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">Document non soumis</p>
                  </div>
                )}
              </CardContent>

              {document && isPending && (
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReject(document.id)}
                    disabled={rejectDocument.isPending}
                  >
                    <X className="mr-1 h-4 w-4" /> Rejeter
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleApprove(document.id)}
                    disabled={approveDocument.isPending}
                  >
                    <Check className="mr-1 h-4 w-4" /> Approuver
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>

      {/* Custom Modal Implementation */}
      {documentViewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg shadow-lg max-w-[700px] max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                {selectedDocument?.mimeType.startsWith('image/') ? (
                  <ImageIcon className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                {selectedDocument
                  ? documentTypeLabels[selectedDocument.type] || selectedDocument.filename
                  : 'Aperçu du document'}
              </div>
            </div>

            {selectedDocument && (
              <div className="p-4">
                {selectedDocument.mimeType.startsWith('image/') ? (
                  <div className="relative w-full h-[500px]">
                    <img
                      src={getFullDocumentUrl(selectedDocument.fileUrl)}
                      alt={selectedDocument.filename || documentTypeLabels[selectedDocument.type]}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                ) : selectedDocument.mimeType === 'application/pdf' ? (
                  <iframe
                    src={`${getFullDocumentUrl(selectedDocument.fileUrl)}#toolbar=0`}
                    className="w-full h-[500px]"
                    title={selectedDocument.filename || documentTypeLabels[selectedDocument.type]}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
                    <FileText className="h-16 w-16 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Ce type de fichier ne peut pas être prévisualisé
                    </p>
                    <Button variant="outline" onClick={() => downloadDocument(selectedDocument)}>
                      Télécharger le document
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 border-t flex justify-between items-center">
              <Button variant="outline" onClick={closeDocumentViewer}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>

              {selectedDocument && (
                <Button variant="outline" onClick={() => downloadDocument(selectedDocument)}>
                  Télécharger
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
