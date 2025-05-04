import { useState } from 'react';
import { format } from 'date-fns';
import { UserRole, UserStatus } from '@prisma/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { UserListItem } from '@/types/admin';
import { 
  EllipsisVertical, 
  Eye, 
  UserCheck, 
  UserX, 
  Download, 
  Filter, 
  RefreshCw, 
  Trash,
  LockIcon,
  MailIcon,
  Tag
} from 'lucide-react';

interface UserTableProps {
  users: UserListItem[];
  onViewUser: (userId: string) => void;
  onUpdateStatus: (userId: string, status: UserStatus) => void;
  onUpdateRole: (userId: string, role: UserRole) => void;
  onForcePasswordReset: (userId: string) => void;
  onExportSelected?: () => void;
  onBulkAction?: (action: string) => void;
  selectedUsers: string[];
  onSelectUser: (userId: string) => void;
  onSelectAllUsers: (selected: boolean) => void;
  onRefresh?: () => void;
}

export function UserTable({ 
  users, 
  onViewUser, 
  onUpdateStatus, 
  onUpdateRole, 
  onForcePasswordReset,
  onExportSelected,
  onBulkAction,
  selectedUsers,
  onSelectUser,
  onSelectAllUsers,
  onRefresh
}: UserTableProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'status' | 'role' | 'passwordReset';
    userId: string;
    newValue?: UserStatus | UserRole;
    title: string;
    description: string;
  } | null>(null);

  const [confirmBulkAction, setConfirmBulkAction] = useState<{
    action: string;
    title: string;
    description: string;
  } | null>(null);

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    let title = '';
    let description = '';

    switch (newStatus) {
      case UserStatus.ACTIVE:
        title = 'Activer le compte utilisateur';
        description =
          'Êtes-vous sûr de vouloir activer ce compte utilisateur ? Il retrouvera l\'accès à la plateforme.';
        break;
      case UserStatus.SUSPENDED:
        title = 'Suspendre le compte utilisateur';
        description =
          'Êtes-vous sûr de vouloir suspendre ce compte utilisateur ? Il perdra l\'accès à la plateforme jusqu\'à sa réactivation.';
        break;
      case UserStatus.INACTIVE:
        title = 'Désactiver le compte utilisateur';
        description =
          'Êtes-vous sûr de vouloir désactiver ce compte utilisateur ? Il ne pourra plus se connecter jusqu\'à sa réactivation.';
        break;
      default:
        break;
    }

    setConfirmAction({
      type: 'status',
      userId,
      newValue: newStatus,
      title,
      description,
    });
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setConfirmAction({
      type: 'role',
      userId,
      newValue: newRole,
      title: 'Modifier le rôle utilisateur',
      description: `Êtes-vous sûr de vouloir changer le rôle de cet utilisateur en ${newRole} ? Cela peut affecter ses permissions et son accès aux fonctionnalités.`,
    });
  };

  const handleForcePasswordReset = (userId: string) => {
    setConfirmAction({
      type: 'passwordReset',
      userId,
      title: 'Forcer la réinitialisation du mot de passe',
      description: 'Êtes-vous sûr de vouloir forcer la réinitialisation du mot de passe pour cet utilisateur ? Un email lui sera envoyé avec un lien de réinitialisation.',
    });
  };

  const handleBulkAction = (action: string) => {
    let title = '';
    let description = '';

    switch (action) {
      case 'ACTIVATE':
        title = 'Activer les comptes sélectionnés';
        description = `Êtes-vous sûr de vouloir activer les ${selectedUsers.length} comptes utilisateurs sélectionnés ?`;
        break;
      case 'DEACTIVATE':
        title = 'Désactiver les comptes sélectionnés';
        description = `Êtes-vous sûr de vouloir désactiver les ${selectedUsers.length} comptes utilisateurs sélectionnés ?`;
        break;
      case 'SUSPEND':
        title = 'Suspendre les comptes sélectionnés';
        description = `Êtes-vous sûr de vouloir suspendre les ${selectedUsers.length} comptes utilisateurs sélectionnés ?`;
        break;
      case 'FORCE_PASSWORD_RESET':
        title = 'Forcer la réinitialisation des mots de passe';
        description = `Êtes-vous sûr de vouloir forcer la réinitialisation du mot de passe pour les ${selectedUsers.length} utilisateurs sélectionnés ?`;
        break;
      case 'SEND_VERIFICATION_EMAIL':
        title = 'Envoyer des emails de vérification';
        description = `Êtes-vous sûr de vouloir envoyer des emails de vérification aux ${selectedUsers.length} utilisateurs sélectionnés ?`;
        break;
      default:
        break;
    }

    setConfirmBulkAction({
      action,
      title,
      description,
    });
  };

  const confirmActionHandler = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'status') {
      onUpdateStatus(confirmAction.userId, confirmAction.newValue as UserStatus);
    } else if (confirmAction.type === 'role') {
      onUpdateRole(confirmAction.userId, confirmAction.newValue as UserRole);
    } else if (confirmAction.type === 'passwordReset') {
      onForcePasswordReset(confirmAction.userId);
    }

    setConfirmAction(null);
  };

  const confirmBulkActionHandler = () => {
    if (!confirmBulkAction) return;
    
    if (onBulkAction) {
      onBulkAction(confirmBulkAction.action);
    }
    
    setConfirmBulkAction(null);
  };

  // Helper to get status badge
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return <Badge className="bg-green-500">Actif</Badge>;
      case UserStatus.PENDING_VERIFICATION:
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case UserStatus.SUSPENDED:
        return <Badge className="bg-red-500">Suspendu</Badge>;
      case UserStatus.INACTIVE:
        return <Badge className="bg-gray-500">Inactif</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Helper to get role badge
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Badge className="bg-purple-500">Admin</Badge>;
      case UserRole.CLIENT:
        return <Badge className="bg-blue-500">Client</Badge>;
      case UserRole.DELIVERER:
        return <Badge className="bg-green-500">Livreur</Badge>;
      case UserRole.MERCHANT:
        return <Badge className="bg-orange-500">Marchand</Badge>;
      case UserRole.PROVIDER:
        return <Badge className="bg-teal-500">Prestataire</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // Helper to get verification badge
  const getVerificationBadge = (isVerified: boolean) => {
    return isVerified ? (
      <Badge className="bg-green-500">
        <UserCheck className="mr-1 h-3 w-3" />
        Vérifié
      </Badge>
    ) : (
      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
        <UserX className="mr-1 h-3 w-3" />
        Non vérifié
      </Badge>
    );
  };

  // Calcul des statistiques de sélection
  const selectedCount = selectedUsers.length;
  const areAllPageUsersSelected = users.length > 0 && users.every(user => selectedUsers.includes(user.id));

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <div className="font-medium text-sm">
              {selectedCount} utilisateur{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions en masse
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkAction('ACTIVATE')}>
                    <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                    Activer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('DEACTIVATE')}>
                    <UserX className="mr-2 h-4 w-4 text-gray-500" />
                    Désactiver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('SUSPEND')}>
                    <UserX className="mr-2 h-4 w-4 text-red-500" />
                    Suspendre
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkAction('FORCE_PASSWORD_RESET')}>
                    <LockIcon className="mr-2 h-4 w-4" />
                    Réinitialiser les mots de passe
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('SEND_VERIFICATION_EMAIL')}>
                    <MailIcon className="mr-2 h-4 w-4" />
                    Envoyer des emails de vérification
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onExportSelected}>
                    <Download className="mr-2 h-4 w-4" />
                    Exporter la sélection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox 
                checked={areAllPageUsersSelected}
                onCheckedChange={onSelectAllUsers}
                aria-label="Sélectionner tous les utilisateurs"
              />
            </TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Vérification</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead>Dernière connexion</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                Aucun utilisateur trouvé.
              </TableCell>
            </TableRow>
          ) : (
            users.map(user => (
              <TableRow key={user.id} className={selectedUsers.includes(user.id) ? "bg-muted/30" : undefined}>
                <TableCell>
                  <Checkbox 
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => onSelectUser(user.id)}
                    aria-label={`Sélectionner ${user.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>{getVerificationBadge(user.isVerified)}</TableCell>
                <TableCell>{format(new Date(user.createdAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'dd/MM/yyyy') : 'Jamais'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewUser(user.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />

                      <DropdownMenuLabel>Statut</DropdownMenuLabel>
                      {user.status !== UserStatus.ACTIVE && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(user.id, UserStatus.ACTIVE)}
                        >
                          Activer
                        </DropdownMenuItem>
                      )}
                      {user.status !== UserStatus.SUSPENDED && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(user.id, UserStatus.SUSPENDED)}
                          className="text-red-600"
                        >
                          Suspendre
                        </DropdownMenuItem>
                      )}
                      {user.status !== UserStatus.INACTIVE && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(user.id, UserStatus.INACTIVE)}
                        >
                          Désactiver
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuLabel>Rôle</DropdownMenuLabel>
                      {Object.values(UserRole).map(
                        role =>
                          user.role !== role && (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => handleRoleChange(user.id, role)}
                            >
                              Changer pour {role}
                            </DropdownMenuItem>
                          )
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel>Outils</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleForcePasswordReset(user.id)}>
                        <LockIcon className="mr-2 h-4 w-4" />
                        Réinitialiser le mot de passe
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSelectUser(user.id)}>
                        <Tag className="mr-2 h-4 w-4" />
                        {selectedUsers.includes(user.id) ? 'Désélectionner' : 'Sélectionner'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Dialogue de confirmation pour les actions individuelles */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionHandler}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue de confirmation pour les actions en masse */}
      <AlertDialog open={!!confirmBulkAction} onOpenChange={() => setConfirmBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmBulkAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmBulkAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkActionHandler}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
