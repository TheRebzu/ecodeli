'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  FileText,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ContractNegotiation {
  id: string;
  contract: {
    id: string;
    title: string;
    contractNumber: string;
  };
  merchant: {
    id: string;
    companyName: string;
    email: string;
    name: string;
  };
  admin: {
    id: string;
    name: string;
    email: string;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  merchantProposal?: any;
  adminCounterProposal?: any;
  finalTerms?: any;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  history: Array<{
    id: string;
    action: string;
    performedBy: {
      id: string;
      name: string;
      role: string;
    };
    data?: any;
    comment?: string;
    createdAt: Date;
  }>;
}

interface ContractNegotiationsProps {
  negotiations: ContractNegotiation[];
  onAcceptProposal: (negotiationId: string, terms: any) => void;
  onRejectProposal: (negotiationId: string, reason: string) => void;
  onMakeCounterProposal: (negotiationId: string, proposal: any) => void;
  onCompleteNegotiation: (negotiationId: string, finalTerms: any) => void;
  onCancelNegotiation: (negotiationId: string, reason: string) => void;
  isLoading: boolean;
}

export function ContractNegotiations({
  negotiations,
  onAcceptProposal,
  onRejectProposal,
  onMakeCounterProposal,
  onCompleteNegotiation,
  onCancelNegotiation,
  isLoading,
}: ContractNegotiationsProps) {
  const [selectedNegotiation, setSelectedNegotiation] = useState<ContractNegotiation | null>(null);
  const [counterProposal, setCounterProposal] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const getStatusBadge = (status: ContractNegotiation['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            En cours
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Terminé
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Annulé
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy à HH:mm', { locale: fr });
  };

  const isExpiringSoon = (expiresAt?: Date) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  };

  const isExpired = (expiresAt?: Date) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (negotiations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune négociation</h3>
          <p className="text-muted-foreground text-center">
            Aucune négociation de contrat n'est en cours pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Négociations de contrats</h2>
          <p className="text-muted-foreground">
            Gérez les négociations en cours avec les commerçants
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {negotiations.map(negotiation => (
          <Card key={negotiation.id} className="relative">
            {isExpired(negotiation.expiresAt) && (
              <div className="absolute top-2 right-2">
                <Badge variant="destructive" className="text-xs">
                  Expiré
                </Badge>
              </div>
            )}
            {isExpiringSoon(negotiation.expiresAt) && !isExpired(negotiation.expiresAt) && (
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Expire bientôt
                </Badge>
              </div>
            )}

            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{negotiation.contract.title}</CardTitle>
                  <CardDescription>
                    Contrat #{negotiation.contract.contractNumber} •{' '}
                    {negotiation.merchant.companyName}
                  </CardDescription>
                </div>
                {getStatusBadge(negotiation.status)}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{negotiation.merchant.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Créé le {formatDate(negotiation.createdAt)}</span>
                  </div>
                  {negotiation.expiresAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Expire le {formatDate(negotiation.expiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Proposition du commerçant */}
                {negotiation.merchantProposal && (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Proposition du commerçant
                    </h4>
                    <div className="text-sm text-blue-800">
                      <pre className="whitespace-pre-wrap font-sans">
                        {JSON.stringify(negotiation.merchantProposal, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Contre-proposition de l'admin */}
                {negotiation.adminCounterProposal && (
                  <div className="rounded-lg bg-orange-50 p-4">
                    <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Contre-proposition admin
                    </h4>
                    <div className="text-sm text-orange-800">
                      <pre className="whitespace-pre-wrap font-sans">
                        {JSON.stringify(negotiation.adminCounterProposal, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Termes finaux */}
                {negotiation.finalTerms && (
                  <div className="rounded-lg bg-green-50 p-4">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Termes finaux acceptés
                    </h4>
                    <div className="text-sm text-green-800">
                      <pre className="whitespace-pre-wrap font-sans">
                        {JSON.stringify(negotiation.finalTerms, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {negotiation.notes && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700">{negotiation.notes}</p>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Voir l'historique
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Historique de la négociation</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {negotiation.history.map(entry => (
                          <div key={entry.id} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {entry.performedBy.name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {entry.performedBy.name}
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {entry.performedBy.role}
                                  </Badge>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(entry.createdAt)}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Action: {entry.action}
                              </p>
                              {entry.comment && <p className="text-sm">{entry.comment}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {negotiation.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">Faire une contre-proposition</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Contre-proposition</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Décrivez votre contre-proposition..."
                              value={counterProposal}
                              onChange={e => setCounterProposal(e.target.value)}
                              className="min-h-32"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setCounterProposal('')}>
                                Annuler
                              </Button>
                              <Button
                                onClick={() => {
                                  onMakeCounterProposal(negotiation.id, {
                                    content: counterProposal,
                                  });
                                  setCounterProposal('');
                                }}
                                disabled={!counterProposal.trim() || isLoading}
                              >
                                Envoyer
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          onAcceptProposal(negotiation.id, negotiation.merchantProposal)
                        }
                        disabled={isLoading}
                      >
                        Accepter
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Rejeter
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rejeter la proposition</AlertDialogTitle>
                            <AlertDialogDescription>
                              Veuillez indiquer la raison du rejet de cette proposition.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea
                            placeholder="Raison du rejet..."
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setRejectionReason('')}>
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                onRejectProposal(negotiation.id, rejectionReason);
                                setRejectionReason('');
                              }}
                              disabled={!rejectionReason.trim()}
                            >
                              Rejeter
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  {negotiation.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onCompleteNegotiation(negotiation.id, negotiation.adminCounterProposal)
                      }
                      disabled={isLoading}
                    >
                      Finaliser
                    </Button>
                  )}

                  {['PENDING', 'IN_PROGRESS'].includes(negotiation.status) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Annuler la négociation
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Annuler la négociation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. La négociation sera définitivement
                            annulée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Retour</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              onCancelNegotiation(negotiation.id, "Annulé par l'administrateur")
                            }
                          >
                            Annuler la négociation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
