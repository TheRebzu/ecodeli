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
import { MoreHorizontal, User, Mail, Phone, Calendar, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from '@/navigation';

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
}

interface UserTableProps {
  users: User[];
  onSelectionChange: (selectedUserIds: string[]) => void;
  selectedUserIds: string[];
  isLoading?: boolean;
}

export default function UserTable({
  users,
  onSelectionChange,
  selectedUserIds,
  isLoading = false,
}: UserTableProps) {
  const t = useTranslations('Admin.verification.users');
  const [selectAll, setSelectAll] = useState(false);

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
                  <TableCell><div className="h-5 w-16 rounded-full bg-muted"></div></TableCell>
                  <TableCell><div className="h-5 w-20 rounded-full bg-muted"></div></TableCell>
                  <TableCell><div className="h-4 w-24 rounded bg-muted"></div></TableCell>
                  <TableCell><div className="h-4 w-20 rounded bg-muted"></div></TableCell>
                  <TableCell><div className="h-4 w-10 rounded bg-muted"></div></TableCell>
                  <TableCell><div className="h-8 w-8 rounded bg-muted"></div></TableCell>
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
                <TableRow key={user.id} className={selectedUserIds.includes(user.id) ? 'bg-muted/50' : ''}>
                <TableCell>
                  <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
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
                        {user.status === 'ACTIVE' ? (
                          <DropdownMenuItem className="text-amber-600">
                            {t('actions.deactivate')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-green-600">
                            {t('actions.activate')}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive">
                          {t('actions.delete')}
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
    </div>
  );
}
