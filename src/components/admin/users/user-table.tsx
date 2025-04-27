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
import { UserListItem } from '@/types/admin';
import { EllipsisVertical, Eye, UserCheck, UserX } from 'lucide-react';

interface UserTableProps {
  users: UserListItem[];
  onViewUser: (userId: string) => void;
  onUpdateStatus: (userId: string, status: UserStatus) => void;
  onUpdateRole: (userId: string, role: UserRole) => void;
}

export function UserTable({ users, onViewUser, onUpdateStatus, onUpdateRole }: UserTableProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'status' | 'role';
    userId: string;
    newValue: UserStatus | UserRole;
    title: string;
    description: string;
  } | null>(null);

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    let title = '';
    let description = '';

    switch (newStatus) {
      case UserStatus.ACTIVE:
        title = 'Activate User Account';
        description =
          'Are you sure you want to activate this user account? They will regain access to the platform.';
        break;
      case UserStatus.SUSPENDED:
        title = 'Suspend User Account';
        description =
          'Are you sure you want to suspend this user account? They will lose access to the platform until reactivated.';
        break;
      case UserStatus.INACTIVE:
        title = 'Deactivate User Account';
        description =
          'Are you sure you want to deactivate this user account? They will not be able to log in until reactivated.';
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
      title: 'Change User Role',
      description: `Are you sure you want to change this user's role to ${newRole}? This may affect their permissions and access to features.`,
    });
  };

  const confirmActionHandler = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'status') {
      onUpdateStatus(confirmAction.userId, confirmAction.newValue as UserStatus);
    } else if (confirmAction.type === 'role') {
      onUpdateRole(confirmAction.userId, confirmAction.newValue as UserRole);
    }

    setConfirmAction(null);
  };

  // Helper to get status badge
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return <Badge className="bg-green-500">Active</Badge>;
      case UserStatus.PENDING_VERIFICATION:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case UserStatus.SUSPENDED:
        return <Badge className="bg-red-500">Suspended</Badge>;
      case UserStatus.INACTIVE:
        return <Badge className="bg-gray-500">Inactive</Badge>;
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
        return <Badge className="bg-green-500">Deliverer</Badge>;
      case UserRole.MERCHANT:
        return <Badge className="bg-orange-500">Merchant</Badge>;
      case UserRole.PROVIDER:
        return <Badge className="bg-teal-500">Provider</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // Helper to get verification badge
  const getVerificationBadge = (isVerified: boolean) => {
    return isVerified ? (
      <Badge className="bg-green-500">
        <UserCheck className="mr-1 h-3 w-3" />
        Verified
      </Badge>
    ) : (
      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
        <UserX className="mr-1 h-3 w-3" />
        Unverified
      </Badge>
    );
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>{getVerificationBadge(user.isVerified)}</TableCell>
                <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewUser(user.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />

                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      {user.status !== UserStatus.ACTIVE && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(user.id, UserStatus.ACTIVE)}
                        >
                          Activate
                        </DropdownMenuItem>
                      )}
                      {user.status !== UserStatus.SUSPENDED && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(user.id, UserStatus.SUSPENDED)}
                          className="text-red-600"
                        >
                          Suspend
                        </DropdownMenuItem>
                      )}
                      {user.status !== UserStatus.INACTIVE && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(user.id, UserStatus.INACTIVE)}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuLabel>Role</DropdownMenuLabel>
                      {Object.values(UserRole).map(
                        role =>
                          user.role !== role && (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => handleRoleChange(user.id, role)}
                            >
                              Change to {role}
                            </DropdownMenuItem>
                          )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionHandler}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
