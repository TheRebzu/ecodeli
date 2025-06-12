'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/trpc/react';
import { UserRole } from '@prisma/client';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  FileText,
  User,
} from 'lucide-react';

export default function DocumentValidationChecker() {
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('DELIVERER');
  const [activeTab, setActiveTab] = useState('check');

  // Queries
  const checkStatusQuery = api.documentFix.checkUserDocumentStatus.useQuery(
    { userId, userRole },
    { enabled: !!userId }
  );

  const compareLogicQuery = api.documentFix.compareValidationLogic.useQuery(
    { userId, userRole },
    { enabled: !!userId }
  );

  const documentsQuery = api.documentFix.getDocumentsWithEffectiveStatus.useQuery(
    { userId },
    { enabled: !!userId }
  );

  // Mutations
  const forceUpdateMutation = api.documentFix.forceUpdateVerificationStatus.useMutation({
    onSuccess: () => {
      checkStatusQuery.refetch();
      compareLogicQuery.refetch();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'EXPIRED':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      APPROVED: 'default',
      REJECTED: 'destructive',
      EXPIRED: 'secondary',
      PENDING: 'outline',
      NOT_SUBMITTED: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Vérificateur de Validation des Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userId">ID Utilisateur</Label>
              <Input
                id="userId"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="Entrez l'ID de l'utilisateur"
              />
            </div>
            <div>
              <Label htmlFor="userRole">Rôle Utilisateur</Label>
              <Select value={userRole} onValueChange={value => setUserRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DELIVERER">Livreur</SelectItem>
                  <SelectItem value="MERCHANT">Commerçant</SelectItem>
                  <SelectItem value="PROVIDER">Prestataire</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {userId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="check">Vérification</TabsTrigger>
            <TabsTrigger value="compare">Comparaison</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="fix-test">🔧 Test de Correction</TabsTrigger>
          </TabsList>

          <TabsContent value="check" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Statut de Validation (Logique Centralisée)</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkStatusQuery.refetch()}
                    disabled={checkStatusQuery.isLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {checkStatusQuery.data && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {getStatusBadge(checkStatusQuery.data.verificationStatus)}
                        </div>
                        <div className="text-sm text-muted-foreground">Statut Global</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {checkStatusQuery.data.allRequiredDocumentsApproved ? 'OUI' : 'NON'}
                        </div>
                        <div className="text-sm text-muted-foreground">Tous Approuvés</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {checkStatusQuery.data.missingDocuments.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Manquants</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {checkStatusQuery.data.isComplete ? 'OUI' : 'NON'}
                        </div>
                        <div className="text-sm text-muted-foreground">Complet</div>
                      </div>
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{checkStatusQuery.data.message}</AlertDescription>
                    </Alert>

                    {checkStatusQuery.data.missingDocuments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Documents manquants :</h4>
                        <div className="flex flex-wrap gap-2">
                          {checkStatusQuery.data.missingDocuments.map(doc => (
                            <Badge key={doc} variant="outline">
                              {doc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => forceUpdateMutation.mutate({ userId, userRole })}
                      disabled={forceUpdateMutation.isPending}
                      className="w-full"
                    >
                      {forceUpdateMutation.isPending ? 'Mise à jour...' : 'Forcer la Mise à Jour'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparaison des Logiques de Validation</CardTitle>
              </CardHeader>
              <CardContent>
                {compareLogicQuery.data && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Ancienne Logique</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Tous approuvés :</span>
                              <Badge
                                variant={
                                  compareLogicQuery.data.comparison.oldLogic.allApproved
                                    ? 'default'
                                    : 'destructive'
                                }
                              >
                                {compareLogicQuery.data.comparison.oldLogic.allApproved
                                  ? 'OUI'
                                  : 'NON'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Documents approuvés :</span>
                              <span>
                                {compareLogicQuery.data.comparison.oldLogic.approvedCount}/
                                {compareLogicQuery.data.comparison.oldLogic.requiredCount}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {compareLogicQuery.data.comparison.oldLogic.method}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Nouvelle Logique</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Tous approuvés :</span>
                              <Badge
                                variant={
                                  compareLogicQuery.data.comparison.newLogic.allApproved
                                    ? 'default'
                                    : 'destructive'
                                }
                              >
                                {compareLogicQuery.data.comparison.newLogic.allApproved
                                  ? 'OUI'
                                  : 'NON'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Statut :</span>
                              {getStatusBadge(
                                compareLogicQuery.data.comparison.newLogic.status.verificationStatus
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {compareLogicQuery.data.comparison.newLogic.method}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert
                      className={
                        compareLogicQuery.data.comparison.isDifferent
                          ? 'border-red-200 bg-red-50'
                          : 'border-green-200 bg-green-50'
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Résultat :</strong>{' '}
                        {compareLogicQuery.data.comparison.recommendation}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documents avec Statut Effectif</CardTitle>
              </CardHeader>
              <CardContent>
                {documentsQuery.data && (
                  <div className="space-y-4">
                    {documentsQuery.data.map(doc => (
                      <Card key={doc.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5" />
                              <div>
                                <h4 className="font-medium">{doc.type}</h4>
                                <p className="text-sm text-muted-foreground">{doc.filename}</p>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              {getStatusBadge(doc.effectiveStatus)}
                              <div className="text-xs text-muted-foreground">
                                Effectivement approuvé: {doc.isEffectivelyApproved ? 'OUI' : 'NON'}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="font-medium">Statut original:</span>{' '}
                              {doc.statusExplanation.originalStatus}
                            </div>
                            <div>
                              <span className="font-medium">Vérification:</span>{' '}
                              {doc.statusExplanation.verificationStatus}
                            </div>
                            <div>
                              <span className="font-medium">Vérifié:</span>{' '}
                              {doc.statusExplanation.isVerified ? 'OUI' : 'NON'}
                            </div>
                            <div>
                              <span className="font-medium">Expiré:</span>{' '}
                              {doc.statusExplanation.isExpired ? 'OUI' : 'NON'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fix-test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>�� Test de Correction - Types de Documents</CardTitle>
                <CardDescription>
                  Teste la correction des types de documents pour les marchands
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🚨 Problème Identifié</h4>
                  <p className="text-yellow-700 text-sm mb-2">
                    <strong>Incohérence entre les seeds et la logique de validation :</strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-yellow-800">Seeds créent :</p>
                      <ul className="list-disc list-inside text-yellow-700">
                        <li>IDENTITY_CARD</li>
                        <li>KBIS</li>
                        <li>BANK_RIB</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-yellow-800">Ancienne validation cherchait :</p>
                      <ul className="list-disc list-inside text-yellow-700">
                        <li>ID_CARD</li>
                        <li>BUSINESS_REGISTRATION</li>
                        <li>PROOF_OF_ADDRESS</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Correction Appliquée</h4>
                  <p className="text-green-700 text-sm mb-2">
                    La fonction <code>REQUIRED_DOCUMENTS_BY_ROLE</code> a été mise à jour pour
                    utiliser les bons types :
                  </p>
                  <div className="bg-green-100 rounded p-2 font-mono text-sm text-green-800">
                    MERCHANT: ['IDENTITY_CARD', 'KBIS', 'BANK_RIB']
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">🔍 Vérification</h4>
                  <p className="text-blue-700 text-sm">
                    Utilisez l'onglet "Vérification Statut" ci-dessus pour tester un utilisateur
                    marchand. Vous devriez maintenant voir ses documents IDENTITY_CARD, KBIS et
                    BANK_RIB être correctement reconnus.
                  </p>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Action Recommandée</AlertTitle>
                  <AlertDescription>
                    Après avoir vérifié que la correction fonctionne, utilisez le bouton "Forcer
                    Mise à Jour" pour mettre à jour le statut de vérification de tous les
                    utilisateurs concernés.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
