'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Search,
  Filter,
  Eye,
  MessageCircle,
  Ban,
  UserCheck,
  MapPin,
  Star,
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/navigation';

type DelivererStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Deliverer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  image?: string;
  status: DelivererStatus;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  createdAt: Date | string;
  lastActiveAt?: Date | string | null;
  totalDeliveries: number;
  completedDeliveries: number;
  rating: number;
  earnings: number;
  hasVehicle: boolean;
  vehicleType?: string;
  preferredZones: string[];
}

interface DeliverersTableProps {
  deliverers: Deliverer[];
  isLoading: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
}

export function DeliverersTable({
  deliverers,
  isLoading,
  totalPages,
  currentPage,
  onPageChange,
  onRefresh,
}: DeliverersTableProps) {
  const t = useTranslations('Admin');
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');

  // États pour les dialogs
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<{
    delivererId: string;
    name: string;
    newStatus: DelivererStatus;
  } | null>(null);

  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [verificationAction, setVerificationAction] = useState<{
    delivererId: string;
    name: string;
  } | null>(null);

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageAction, setMessageAction] = useState<{
    delivererId: string;
    name: string;
  } | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [messageSubject, setMessageSubject] = useState('');

  // Mutations pour les actions admin
  const updateStatusMutation = api.admin.deliverers.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: 'Statut du livreur mis à jour',
      });
      setIsStatusDialogOpen(false);
      onRefresh?.();
    },
    onError: (error) => {
      toast({
        title: `Erreur: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const verifyDelivererMutation = api.admin.deliverers.verifyDeliverer.useMutation({
    onSuccess: () => {
      toast({
        title: 'Livreur vérifié avec succès',
      });
      setIsVerificationDialogOpen(false);
      onRefresh?.();
    },
    onError: (error) => {
      toast({
        title: `Erreur: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handlers pour les actions
  const handleSendMessage = (delivererId: string, name: string) => {
    setMessageAction({ delivererId, name });
    setMessageSubject('');
    setMessageContent('');
    setIsMessageDialogOpen(true);
  };

  const handleStatusChange = (delivererId: string, name: string, newStatus: DelivererStatus) => {
    setStatusAction({ delivererId, name, newStatus });
    setIsStatusDialogOpen(true);
  };

  const handleVerifyDeliverer = (delivererId: string, name: string) => {
    setVerificationAction({ delivererId, name });
    setIsVerificationDialogOpen(true);
  };

  const handleConfirmStatusChange = () => {
    if (statusAction) {
      updateStatusMutation.mutate({
        userId: statusAction.delivererId,
        status: statusAction.newStatus,
      });
    }
  };

  const handleConfirmVerification = () => {
    if (verificationAction) {
      verifyDelivererMutation.mutate({
        userId: verificationAction.delivererId,
      });
    }
  };

  const handleConfirmMessage = () => {
    if (messageAction && messageContent && messageSubject) {
      // Ici on pourrait implémenter l'envoi de message
      toast({
        title: 'Message envoyé',
      });
      setIsMessageDialogOpen(false);
    }
  };

  // Filtrer les livreurs
  const filteredDeliverers = deliverers.filter((deliverer) => {
    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !deliverer.firstName.toLowerCase().includes(searchLower) &&
        !deliverer.lastName.toLowerCase().includes(searchLower) &&
        !deliverer.email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Filtre par statut
    if (statusFilter && statusFilter !== 'ALL' && deliverer.status !== statusFilter) {
      return false;
    }

    // Filtre par vérification
    if (verificationFilter && verificationFilter !== 'ALL' && deliverer.verificationStatus !== verificationFilter) {
      return false;
    }

    return true;
  });

  const renderStatusBadge = (status: DelivererStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">Suspendu</Badge>;
      case 'PENDING_VERIFICATION':
        return <Badge variant="outline">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderVerificationBadge = (status: VerificationStatus, isVerified: boolean) => {
    if (isVerified) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Vérifié
        </Badge>
      );
    }

    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejeté
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatEarnings = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Vérifier si la date est valide
      if (isNaN(dateObj.getTime())) {
        return '-';
      }
      
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(dateObj);
    } catch (error) {
      console.warn('Erreur lors du formatage de la date:', date, error);
      return '-';
    }
  };

  const getCompletionRate = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="INACTIVE">Inactif</SelectItem>
            <SelectItem value="SUSPENDED">Suspendu</SelectItem>
            <SelectItem value="PENDING_VERIFICATION">En attente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verificationFilter} onValueChange={setVerificationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Vérification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="APPROVED">Approuvé</SelectItem>
            <SelectItem value="REJECTED">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Livreur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Vérification</TableHead>
              <TableHead>Livraisons</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Gains</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliverers.map((deliverer) => (
              <TableRow key={deliverer.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={deliverer.image} />
                      <AvatarFallback>
                        {deliverer.firstName[0]}{deliverer.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {deliverer.firstName} {deliverer.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {deliverer.email}
                      </div>
                      {deliverer.phone && (
                        <div className="text-sm text-muted-foreground">
                          {deliverer.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{renderStatusBadge(deliverer.status)}</TableCell>
                <TableCell>
                  {renderVerificationBadge(deliverer.verificationStatus, deliverer.isVerified)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{deliverer.completedDeliveries}/{deliverer.totalDeliveries}</div>
                    <div className="text-muted-foreground">
                      {getCompletionRate(deliverer.completedDeliveries, deliverer.totalDeliveries)}% réussite
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{deliverer.rating.toFixed(1)}</span>
                  </div>
                </TableCell>
                <TableCell>{formatEarnings(deliverer.earnings)}</TableCell>
                <TableCell>
                  {deliverer.hasVehicle ? (
                    <div className="text-sm">
                      <div>{deliverer.vehicleType || 'Véhicule'}</div>
                      <Badge variant="outline" className="text-xs">
                        Véhiculé
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      À pied
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(deliverer.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/deliverers/${deliverer.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir le profil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendMessage(deliverer.id, `${deliverer.firstName} ${deliverer.lastName}`)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Envoyer un message
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/verification/deliverer/${deliverer.id}`}>
                          <MapPin className="mr-2 h-4 w-4" />
                          Voir les documents
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!deliverer.isVerified && deliverer.verificationStatus === 'PENDING' && (
                        <DropdownMenuItem
                          onClick={() => handleVerifyDeliverer(deliverer.id, `${deliverer.firstName} ${deliverer.lastName}`)}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Vérifier
                        </DropdownMenuItem>
                      )}
                      {deliverer.status === 'ACTIVE' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(deliverer.id, `${deliverer.firstName} ${deliverer.lastName}`, 'SUSPENDED')}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Suspendre
                        </DropdownMenuItem>
                      )}
                      {deliverer.status === 'SUSPENDED' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(deliverer.id, `${deliverer.firstName} ${deliverer.lastName}`, 'ACTIVE')}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Réactiver
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de confirmation de changement de statut */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction?.newStatus === 'SUSPENDED' ? 'Suspendre le livreur' : 'Réactiver le livreur'}
            </DialogTitle>
            <DialogDescription>
              {statusAction?.newStatus === 'SUSPENDED'
                ? `Vous êtes sur le point de suspendre ${statusAction?.name}. Le livreur ne pourra plus accepter de nouvelles livraisons.`
                : `Vous êtes sur le point de réactiver ${statusAction?.name}. Le livreur pourra à nouveau accepter des livraisons.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={statusAction?.newStatus === 'SUSPENDED' ? 'destructive' : 'default'}
              onClick={handleConfirmStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending
                ? 'Traitement...'
                : statusAction?.newStatus === 'SUSPENDED'
                  ? 'Confirmer la suspension'
                  : 'Confirmer la réactivation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de vérification */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vérifier le livreur</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de vérifier {verificationAction?.name}. Cette action validera ses documents et lui permettra de commencer à effectuer des livraisons.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerificationDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmVerification}
              disabled={verifyDelivererMutation.isPending}
            >
              {verifyDelivererMutation.isPending ? 'Traitement...' : 'Confirmer la vérification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'envoi de message */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un message</DialogTitle>
            <DialogDescription>
              Envoyer un message à {messageAction?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message-subject">Sujet</Label>
              <Input
                id="message-subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Sujet du message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-content">Message</Label>
              <Textarea
                id="message-content"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Contenu de votre message..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmMessage}
              disabled={!messageContent || !messageSubject}
            >
              Envoyer le message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Livreur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Vérification</TableHead>
              <TableHead>Livraisons</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Gains</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 