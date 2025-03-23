import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  PlusIcon,
  SearchIcon, 
  FilterIcon,
  ArrowUpDownIcon,
  MoreHorizontalIcon, 
  CheckIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { Role, Status } from '@prisma/client';

import { getAdminUsers } from '@/lib/actions/admin-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default async function AdminUsersPage({ 
  searchParams 
}: { 
  searchParams: { page?: string; limit?: string; role?: string; status?: string; search?: string; } 
}) {
  // Récupérer les paramètres de la requête
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const limit = searchParams.limit ? parseInt(searchParams.limit) : 10;
  const role = searchParams.role as Role | undefined;
  const status = searchParams.status as Status | undefined;
  const search = searchParams.search;

  // Récupérer les utilisateurs
  const result = await getAdminUsers({
    page,
    limit,
    role,
    status,
    search,
  });

  if (!result) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Accès interdit</h1>
          <p className="text-muted-foreground">Vous n&apos;avez pas les droits d&apos;accès à cette page.</p>
        </div>
      </div>
    );
  }

  // Destructurer les données
  const { data: users, meta } = result;

  // Obtenir le statut du badge par statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'SUSPENDED':
        return 'destructive';
      case 'DELETED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Obtenir la couleur du badge par rôle
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'CLIENT':
        return 'default';
      case 'COURIER':
        return 'secondary';
      case 'MERCHANT':
        return 'default';
      case 'PROVIDER':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Générer la pagination
  const generatePagination = () => {
    const pages = [];
    
    // Première page
    if (meta.page > 1) {
      pages.push(
        <PaginationItem key="first">
          <PaginationLink href={`?page=1&limit=${limit}`}>1</PaginationLink>
        </PaginationItem>
      );
    }
    
    // Ellipsis au début
    if (meta.page > 3) {
      pages.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Pages autour de la page actuelle
    for (let i = Math.max(1, meta.page - 1); i <= Math.min(meta.totalPages, meta.page + 1); i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            href={`?page=${i}&limit=${limit}`} 
            isActive={i === meta.page}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Ellipsis à la fin
    if (meta.page < meta.totalPages - 2) {
      pages.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Dernière page
    if (meta.page < meta.totalPages) {
      pages.push(
        <PaginationItem key="last">
          <PaginationLink href={`?page=${meta.totalPages}&limit=${limit}`}>
            {meta.totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs de la plateforme EcoDeli
          </p>
        </div>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader className="px-6">
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            {meta.total} utilisateur(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="flex items-center w-full md:w-auto">
              <SearchIcon className="w-4 h-4 absolute ml-3 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un utilisateur..." 
                className="pl-9 w-full md:w-[250px]" 
                defaultValue={search}
              />
            </div>
            <div className="flex flex-1 items-center gap-4 ml-auto">
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <Select defaultValue={role || ""}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les rôles</SelectItem>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="COURIER">Livreur</SelectItem>
                    <SelectItem value="MERCHANT">Commerçant</SelectItem>
                    <SelectItem value="PROVIDER">Prestataire</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue={status || ""}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les statuts</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="APPROVED">Approuvé</SelectItem>
                    <SelectItem value="REJECTED">Rejeté</SelectItem>
                    <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="shrink-0">
                  <FilterIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <div className="flex items-center space-x-1">
                      <span>Utilisateur</span>
                      <ArrowUpDownIcon className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date d&apos;inscription</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || ""} alt={user.name} />
                          <AvatarFallback className="bg-primary/10">
                            <UserIcon className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-none">{user.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/users/${user.id}`}>
                                Voir le détail
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === 'PENDING' && (
                              <DropdownMenuItem className="text-green-600">
                                <CheckIcon className="mr-2 h-4 w-4" />
                                Approuver
                              </DropdownMenuItem>
                            )}
                            {user.status === 'APPROVED' && (
                              <DropdownMenuItem className="text-amber-600">
                                <AlertTriangleIcon className="mr-2 h-4 w-4" />
                                Suspendre
                              </DropdownMenuItem>
                            )}
                            {user.status === 'SUSPENDED' && (
                              <DropdownMenuItem className="text-green-600">
                                <CheckIcon className="mr-2 h-4 w-4" />
                                Réactiver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Aucun utilisateur trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {meta.page > 1 && (
                  <PaginationPrevious href={`?page=${meta.page - 1}&limit=${limit}`} />
                )}
                {generatePagination()}
                {meta.page < meta.totalPages && (
                  <PaginationNext href={`?page=${meta.page + 1}&limit=${limit}`} />
                )}
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 