'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { 
  FileText, 
  PenTool, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Eye,
  Clock
} from 'lucide-react';
import { ContractStatus } from '@prisma/client';

interface ContractSignatureProps {
  contractId: string;
  userRole?: 'MERCHANT' | 'ADMIN';
  onSignatureComplete?: () => void;
}

export default function ContractSignature({ 
  contractId, 
  userRole = 'MERCHANT',
  onSignatureComplete 
}: ContractSignatureProps) {
  const { toast } = useToast();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signatureNote, setSignatureNote] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');

  // Récupérer les détails du contrat
  const { data: contract, isLoading, refetch } = api.merchant.contracts.getContractById.useQuery({
    contractId
  });

  // Mutations
  const signContractMutation = api.merchant.contracts.signContract.useMutation({
    onSuccess: () => {
      toast({
        title: 'Contrat signé avec succès',
        description: 'Votre signature a été enregistrée et le contrat a été transmis pour validation',
        variant: 'default'
      });
      setIsSignatureDialogOpen(false);
      refetch();
      onSignatureComplete?.();
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la signature',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const adminSignMutation = userRole === 'ADMIN' 
    ? api.contract.signAndValidateContract.useMutation({
        onSuccess: () => {
          toast({
            title: 'Contrat validé',
            description: 'Le contrat a été signé et validé par l\'administration',
            variant: 'default'
          });
          setIsSignatureDialogOpen(false);
          refetch();
          onSignatureComplete?.();
        },
        onError: (error) => {
          toast({
            title: 'Erreur lors de la validation',
            description: error.message,
            variant: 'destructive'
          });
        }
      })
    : null;

  const generatePdfMutation = api.merchant.contracts.generatePdf.useMutation({
    onSuccess: (data) => {
      window.open(data.pdfUrl, '_blank');
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSignature = () => {
    if (!acceptedTerms) {
      toast({
        title: 'Acceptation requise',
        description: 'Vous devez accepter les termes et conditions pour signer le contrat',
        variant: 'destructive'
      });
      return;
    }

    // Générer une signature électronique simple
    const signature = `${userRole.toLowerCase()}_signature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (userRole === 'MERCHANT') {
      signContractMutation.mutate({
        contractId,
        merchantSignature: signature
      });
    } else if (userRole === 'ADMIN' && adminSignMutation) {
      adminSignMutation.mutate({
        contractId,
        merchantSignature: contract?.merchantSignature || '',
        signedById: undefined // sera défini côté serveur
      });
    }
  };

  const canSign = () => {
    if (userRole === 'MERCHANT') {
      return contract?.status === ContractStatus.DRAFT || 
             contract?.status === ContractStatus.PENDING_SIGNATURE;
    }
    if (userRole === 'ADMIN') {
      return contract?.status === ContractStatus.PENDING_SIGNATURE && 
             contract?.merchantSignature;
    }
    return false;
  };

  const getSignatureStatus = () => {
    if (!contract) return null;

    const isMerchantSigned = !!contract.merchantSignature;
    const isAdminSigned = !!contract.adminSignature;

    if (contract.status === ContractStatus.ACTIVE && isMerchantSigned && isAdminSigned) {
      return {
        type: 'success' as const,
        icon: CheckCircle,
        message: 'Contrat entièrement signé et actif'
      };
    }

    if (contract.status === ContractStatus.PENDING_SIGNATURE && isMerchantSigned) {
      return {
        type: 'warning' as const,
        icon: Clock,
        message: 'En attente de validation administrateur'
      };
    }

    if (contract.status === ContractStatus.DRAFT || !isMerchantSigned) {
      return {
        type: 'info' as const,
        icon: PenTool,
        message: 'En attente de signature du commerçant'
      };
    }

    return null;
  };

  const signatureStatus = getSignatureStatus();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement du contrat...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!contract) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Contrat non trouvé</h3>
          <p className="text-muted-foreground">
            Le contrat demandé n'existe pas ou vous n'avez pas les permissions pour y accéder.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statut de signature */}
      {signatureStatus && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <signatureStatus.icon className={`h-5 w-5 ${
                signatureStatus.type === 'success' ? 'text-green-500' :
                signatureStatus.type === 'warning' ? 'text-yellow-500' :
                'text-blue-500'
              }`} />
              <span className="font-medium">{signatureStatus.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations du contrat */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {contract.title}
            </CardTitle>
            <Badge variant="outline">#{contract.contractNumber}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <p>{contract.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Statut</label>
              <p>{contract.status}</p>
            </div>
            {contract.monthlyFee && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Frais mensuels</label>
                <p>{Number(contract.monthlyFee).toFixed(2)}€</p>
              </div>
            )}
            {contract.commissionRate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Taux de commission</label>
                <p>{(Number(contract.commissionRate) * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Contenu du contrat</label>
            <div 
              className="mt-2 p-4 border rounded-lg bg-muted/30 max-h-60 overflow-y-auto prose prose-sm"
              dangerouslySetInnerHTML={{ __html: contract.content }}
            />
          </div>

          {/* Historique des signatures */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Historique des signatures</label>
            <div className="space-y-2">
              {contract.merchantSignature && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Signé par le commerçant</span>
                  {contract.signedAt && (
                    <span className="text-muted-foreground">
                      le {new Date(contract.signedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
              {contract.adminSignature && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Validé par l'administration</span>
                  {contract.validatedAt && (
                    <span className="text-muted-foreground">
                      le {new Date(contract.validatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {contract.fileUrl && (
              <Button
                variant="outline"
                onClick={() => generatePdfMutation.mutate({ contractId })}
                disabled={generatePdfMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            )}

            {canSign() && (
              <Button onClick={() => setIsSignatureDialogOpen(true)}>
                <PenTool className="h-4 w-4 mr-2" />
                {userRole === 'MERCHANT' ? 'Signer le contrat' : 'Valider et signer'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de signature */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {userRole === 'MERCHANT' ? 'Signature du contrat' : 'Validation et signature'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Contrat: {contract.title}</label>
              <p className="text-sm text-muted-foreground">#{contract.contractNumber}</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="accept-terms"
                checked={acceptedTerms}
                onCheckedChange={setAcceptedTerms}
              />
              <label htmlFor="accept-terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                J'accepte les termes et conditions de ce contrat
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Note (optionnel)</label>
              <Textarea
                placeholder="Ajoutez une note sur cette signature..."
                value={signatureNote}
                onChange={(e) => setSignatureNote(e.target.value)}
                className="mt-1"
              />
            </div>

            {userRole === 'ADMIN' && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  En validant ce contrat, vous confirmez que tous les termes ont été vérifiés 
                  et que le contrat peut entrer en vigueur.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSignatureDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSignature}
              disabled={!acceptedTerms || signContractMutation.isPending || (adminSignMutation?.isPending)}
            >
              {(signContractMutation.isPending || adminSignMutation?.isPending) ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <PenTool className="h-4 w-4 mr-2" />
              )}
              {userRole === 'MERCHANT' ? 'Signer' : 'Valider et signer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}