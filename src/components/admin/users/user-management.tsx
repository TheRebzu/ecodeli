'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeDate } from '@/lib/utils';
import { UserRole, UserStatus } from '@prisma/client';
import {
  MoreHorizontal,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle,
  Ban,
  Power,
  Trash2,
} from 'lucide-react';
import { Link } from '@/navigation';
import { useUserBan } from '@/hooks/use-user-ban';
import { UserBanAction } from '@/types/user';
import { useUserActivation } from '@/hooks/use-user-activation';
import { api } from '@/trpc/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt?: Date | null;
  isVerified: boolean;
  phoneNumber?: string | null;
  documentsCount?: number;
  pendingVerificationsCount?: number;
  lastActivityAt?: Date | null;
  image?: string | null;
  isBanned: boolean;
  bannedAt?: Date | null;
  banReason?: string | null;
}

interface UserTableProps {
  users: User[];
  onSelectionChange: (selectedUserIds: string[]) => void;
  selectedUserIds: string[];
  isLoading?: boolean;
}

// Composant de table des utilisateurs pour l'interface d'administration
export default function UserTable({
  users,
  onSelectionChange,
  selectedUserIds,
  isLoading = false,
}: UserTableProps) {
  const t = useTranslations('Admin.verification.users');
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  // États pour les dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [banAction, setBanAction] = useState<{
    userId: string;
    name: string;
    action: UserBanAction;
  } | null>(null);
  const [banReason, setBanReason] = useState('');

  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
  const [activationAction, setActivationAction] = useState<{
    userId: string;
    name: string;
    activate: boolean;
  } | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<{ userId: string; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Hooks
  const userBan = useUserBan();
  const { toggleUserActivation, isPending: isActivationPending } = useUserActivation();
  const deleteUserMutation = api.adminUser.permanentlyDeleteUser.useMutation({
    onSuccess: () => {
      toast({
        title: 'Utilisateur supprimé',
        variant: 'default',
      });
      setIsDeleteDialogOpen(false);
      // Recharger la page ou rafraîchir la liste
      window.location.reload();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        variant: 'destructive',
      });
      console.error('Erreur de suppression:', error);
    },
  });

  // Gérer la sélection de tous les utilisateurs
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    onSelectionChange(checked ? users.map(user => user.id) : []);
  };

  // Gérer la sélection individuelle
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUserIds, userId]);
    } else {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    }
  };

  // Fonction pour obtenir la couleur du badge de statut
  const getStatusBadgeVariant = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING_VERIFICATION':
        return 'warning';
      case 'SUSPENDED':
        return 'destructive';
      case 'INACTIVE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Fonction pour obtenir la couleur du badge de rôle
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'DELIVERER':
        return 'default';
      case 'MERCHANT':
        return 'secondary';
      case 'PROVIDER':
        return 'success';
      case 'CLIENT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Handler pour ouvrir la modale de ban
  const handleBanAction = (userId: string, userName: string, action: UserBanAction) => {
    setBanAction({ userId, name: userName, action });
    setBanReason('');
    setIsDialogOpen(true);
  };

  // Handler pour confirmer le ban/déban
  const handleConfirmBan = () => {
    if (!banAction) return;

    userBan.mutate(
      {
        userId: banAction.userId,
        action: banAction.action,
        reason: banAction.action === UserBanAction.BAN ? banReason : undefined,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          toast({
            title:
              banAction.action === UserBanAction.BAN ? 'Utilisateur banni' : 'Utilisateur débanni',
            variant: 'default',
          });
        },
        onError: error => {
          toast({
            title: 'Erreur',
            variant: 'destructive',
          });
          console.error('Erreur:', error);
        },
      }
    );
  };

  // Handler pour ouvrir la modale d'activation/désactivation
  const handleActivationAction = (userId: string, userName: string, activate: boolean) => {
    setActivationAction({ userId, name: userName, activate });
    setIsActivationDialogOpen(true);
  };

  // Handler pour confirmer l'activation/désactivation
  const handleConfirmActivation = () => {
    if (!activationAction) return;

    toggleUserActivation(activationAction.userId, activationAction.activate);
    setIsActivationDialogOpen(false);
  };

  // Handler pour ouvrir la modale de suppression
  const handleDeleteAction = (userId: string, userName: string) => {
    setDeleteAction({ userId, name: userName });
    setDeleteReason('');
    setAdminPassword('');
    setIsDeleteDialogOpen(true);
  };

  // Handler pour confirmer la suppression
  const handleConfirmDelete = () => {
    if (!deleteAction || !adminPassword || !deleteReason) return;

    deleteUserMutation.mutate({
      userId: deleteAction.userId,
      adminPassword,
      reason: deleteReason,
    });
  };

  // RENDU PRINCIPAL
  return (
    <div className="overflow-x-auto">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  aria-label={t('selectAll')}
                />
              </TableHead>
              <TableHead className="w-[220px]">{t('table.user')}</TableHead>
              <TableHead className="w-[100px]">{t('table.role')}</TableHead>
              <TableHead className="w-[120px]">{t('table.status')}</TableHead>
              <TableHead className="w-[120px]">{t('table.created')}</TableHead>
              <TableHead className="w-[120px]">{t('table.lastActive')}</TableHead>
              <TableHead className="w-[100px]">{t('table.documents')}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell>
                    <div className="h-4 w-4 rounded-sm bg-muted"></div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-muted"></div>
                      <div className="space-y-1">
                        <div className="h-4 w-32 rounded bg-muted"></div>
                        <div className="h-3 w-24 rounded bg-muted"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-16 rounded-full bg-muted"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-20 rounded-full bg-muted"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 rounded bg-muted"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 rounded bg-muted"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-10 rounded bg-muted"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-8 rounded bg-muted"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">{t('noUsers')}</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map(user => (
                <TableRow
                  key={user.id}
                  className={selectedUserIds.includes(user.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={checked => handleSelectUser(user.id, !!checked)}
                      aria-label={`Select ${user.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.image ?? undefined} alt={user.name} />
                        <AvatarFallback>
                          {user.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Mail className="mr-1 h-3 w-3" />
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Phone className="mr-1 h-3 w-3" />
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role) as any}>
                      {t(`roles.${user.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <Badge variant={getStatusBadgeVariant(user.status) as any}>
                        {t(`status.${user.status}`)}
                      </Badge>
                      {user.status === 'PENDING_VERIFICATION' && (
                        <div className="flex items-center space-x-1">
                          {user.isVerified ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-xs">
                            {user.isVerified ? t('verified') : t('unverified')}
                          </span>
                        </div>
                      )}
                      {/* Afficher le statut de bannissement */}
                      {user.status === 'SUSPENDED' && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Ban className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-red-500">Suspendu</span>
                        </div>
                      )}
                      {user.status === 'INACTIVE' && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Power className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">Désactivé</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{formatRelativeDate(user.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.lastActivityAt ? (
                      <span className="text-sm">{formatRelativeDate(user.lastActivityAt)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('never')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{user.documentsCount || 0}</span>
                      {(user.pendingVerificationsCount ?? 0) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {user.pendingVerificationsCount ?? 0} {t('pending')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{t('openMenu')}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions.title')}</DropdownMenuLabel>

                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${user.id}`}>{t('actions.view')}</Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${user.id}/edit`}>{t('actions.edit')}</Link>
                        </DropdownMenuItem>

                        {user.role !== 'ADMIN' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/verification/user/${user.id}`}>
                              {t('actions.verify')}
                            </Link>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Actions d'activation/désactivation */}
                        {user.status === 'ACTIVE' ? (
                          <DropdownMenuItem
                            className="text-amber-600"
                            onClick={() => handleActivationAction(user.id, user.name, false)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            Désactiver le compte
                          </DropdownMenuItem>
                        ) : (
                          user.status === 'INACTIVE' && (
                            <DropdownMenuItem
                              className="text-green-600"
                              onClick={() => handleActivationAction(user.id, user.name, true)}
                            >
                              <Power className="h-4 w-4 mr-2" />
                              Activer le compte
                            </DropdownMenuItem>
                          )
                        )}

                        {/* Action de bannissement/débannissement */}
                        {user.status === 'SUSPENDED' ? (
                          <DropdownMenuItem
                            className="text-green-600 font-medium"
                            onClick={() => handleBanAction(user.id, user.name, UserBanAction.UNBAN)}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Débannir l'utilisateur
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleBanAction(user.id, user.name, UserBanAction.BAN)}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Bannir l'utilisateur
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Action de suppression */}
                        <DropdownMenuItem
                          className="text-destructive font-medium"
                          onClick={() => handleDeleteAction(user.id, user.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer définitivement
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmation de bannissement/débannissement */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banAction?.action === UserBanAction.BAN
                ? 'Bannir un utilisateur'
                : 'Débannir un utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {banAction?.action === UserBanAction.BAN
                ? `Vous êtes sur le point de bannir ${banAction?.name}. Cette action suspendra son compte.`
                : `Vous êtes sur le point de débannir ${banAction?.name}. Cette action réactivera son compte.`}
            </DialogDescription>
          </DialogHeader>

          {banAction?.action === UserBanAction.BAN && (
            <div className="space-y-2 py-4">
              <label htmlFor="reason" className="text-sm font-medium">
                Raison du bannissement
              </label>
              <textarea
                id="reason"
                className="w-full min-h-[100px] p-2 border rounded-md"
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Veuillez indiquer la raison du bannissement..."
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={banAction?.action === UserBanAction.BAN ? 'destructive' : 'default'}
              onClick={handleConfirmBan}
              disabled={
                userBan.isPending || (banAction?.action === UserBanAction.BAN && !banReason)
              }
            >
              {userBan.isPending
                ? 'Traitement...'
                : banAction?.action === UserBanAction.BAN
                  ? 'Confirmer le bannissement'
                  : 'Confirmer le débannissement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation d'activation/désactivation */}
      <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activationAction?.activate
                ? 'Activer un compte utilisateur'
                : 'Désactiver un compte utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {activationAction?.activate
                ? `Vous êtes sur le point d'activer le compte de ${activationAction?.name}. L'utilisateur pourra à nouveau accéder à son compte.`
                : `Vous êtes sur le point de désactiver le compte de ${activationAction?.name}. L'utilisateur ne pourra plus accéder à son compte.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivationDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={activationAction?.activate ? 'default' : 'secondary'}
              onClick={handleConfirmActivation}
              disabled={isActivationPending}
            >
              {isActivationPending
                ? 'Traitement...'
                : activationAction?.activate
                  ? "Confirmer l'activation"
                  : 'Confirmer la désactivation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Supprimer définitivement un utilisateur
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de{' '}
              <strong className="text-destructive">supprimer définitivement</strong> le compte de{' '}
              <strong>{deleteAction?.name}</strong>. Cette action est irréversible et supprimera
              toutes les données associées à cet utilisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-reason" className="text-sm font-medium">
                Raison de la suppression
              </Label>
              <Textarea
                id="delete-reason"
                className="w-full min-h-[80px]"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="Indiquez la raison de cette suppression définitive..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-sm font-medium">
                Votre mot de passe administrateur
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Entrez votre mot de passe pour confirmer"
                required
              />
              <p className="text-xs text-muted-foreground">
                Pour des raisons de sécurité, vous devez confirmer cette action avec votre mot de
                passe administrateur.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteUserMutation.isPending || !deleteReason || !adminPassword}
            >
              {deleteUserMutation.isPending
                ? 'Suppression en cours...'
                : 'Confirmer la suppression définitive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
