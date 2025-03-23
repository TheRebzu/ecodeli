"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { 
  ChevronDown, 
  Download, 
  Filter, 
  MoreHorizontal, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  UserCog, 
  UserPlus,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Shield,
  UserX,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger, 
  DropdownMenuLabel 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";

// Types
type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin: Date | null;
};

type Meta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type UsersResponse = {
  data: User[];
  meta: Meta;
};

// Fonction helper pour formater la date
function formatDate(dateString: string | null): string {
  if (!dateString) return "Jamais";
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Fonction pour déterminer la couleur du badge de statut
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "INACTIVE":
      return "secondary" as const;
    case "PENDING":
      return "outline" as const;
    case "SUSPENDED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

// Fonction de rendu du texte de statut
function renderStatusText(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Actif";
    case "INACTIVE":
      return "Inactif";
    case "PENDING":
      return "En attente";
    case "SUSPENDED":
      return "Suspendu";
    default:
      return status;
  }
}

// Fonction pour formatter le rôle en français
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    "ADMIN": "Administrateur",
    "CLIENT": "Client",
    "COURIER": "Livreur",
    "MERCHANT": "Marchand",
    "PROVIDER": "Prestataire"
  };
  
  return roleMap[role] || role;
}

// Status badge configuration
const STATUS_COLORS = {
  'ACTIVE': 'bg-green-100 text-green-800 hover:bg-green-100',
  'PENDING': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'SUSPENDED': 'bg-red-100 text-red-800 hover:bg-red-100',
};

// Role badge configuration
const ROLE_COLORS = {
  'ADMIN': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  'CLIENT': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  'MERCHANT': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  'COURIER': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

// Translations
const STATUS_TRANSLATIONS = {
  'ACTIVE': 'Actif',
  'PENDING': 'En attente',
  'SUSPENDED': 'Suspendu',
};

const ROLE_TRANSLATIONS = {
  'ADMIN': 'Administrateur',
  'CLIENT': 'Client',
  'MERCHANT': 'Commerçant',
  'COURIER': 'Livreur',
};

// Components
type FiltersProps = {
  searchTerm: string;
  selectedRole: string | null;
  selectedStatus: string | null;
  dateRange: DateRange | undefined;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string | null) => void;
  onStatusChange: (value: string | null) => void;
  onDateRangeChange: (value: DateRange | undefined) => void;
  onReset: () => void;
  onApply: () => void;
}

function UserFilters({
  searchTerm,
  selectedRole,
  selectedStatus,
  dateRange,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onDateRangeChange,
  onReset,
  onApply
}: FiltersProps) {
  const activeFiltersCount = [
    selectedRole, 
    selectedStatus, 
    dateRange
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="flex flex-col gap-4">
              <h4 className="font-medium">Filtres</h4>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="status" className="text-sm font-medium">
                    Statut
                  </label>
                  <Select
                    value={selectedStatus || ""}
                    onValueChange={(value) => onStatusChange(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      {Object.entries(STATUS_TRANSLATIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Rôle
                  </label>
                  <Select
                    value={selectedRole || ""}
                    onValueChange={(value) => onRoleChange(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les rôles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les rôles</SelectItem>
                      {Object.entries(ROLE_TRANSLATIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Date d'inscription
                  </label>
                  <DatePickerWithRange 
                    date={dateRange} 
                    setDate={onDateRangeChange} 
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onReset}>
                  Réinitialiser
                </Button>
                <Button size="sm" onClick={onApply}>
                  Appliquer
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// User row
type UserRowProps = {
  user: User;
  onViewDetails: (id: string) => void;
}

function UserRow({ user, onViewDetails }: UserRowProps) {
  return (
    <TableRow key={user.id}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.image || ""} alt={user.name} />
            <AvatarFallback className="bg-primary/10">
              {user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">
              ID: {user.id.substring(0, 8)}...
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{user.email}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant="outline" 
          className={`${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS] || 'bg-gray-100 text-gray-800'}`}
        >
          {formatRole(user.role)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge 
          variant={getStatusBadgeVariant(user.status)}
          className={STATUS_COLORS[user.status as keyof typeof STATUS_COLORS] || ''}
        >
          {renderStatusText(user.status)}
        </Badge>
      </TableCell>
      <TableCell>
        {formatDate(user.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                <User className="mr-2 h-4 w-4" />
                Détails
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserCog className="mr-2 h-4 w-4" />
                Éditer le profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Shield className="mr-2 h-4 w-4" />
                Modifier le rôle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <UserX className="mr-2 h-4 w-4" />
                Suspendre
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Pagination
type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function UserPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  
  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Affichage de <strong>{start}</strong> à <strong>{end}</strong> sur <strong>{totalItems}</strong> utilisateurs
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <span className="sr-only">Page précédente</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{currentPage}</div>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Page suivante</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Skeleton loader pour Suspense
function UserTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <div className="rounded-md border">
        <div className="grid grid-cols-6 border-b">
          {Array(6).fill(null).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
        {Array(5).fill(null).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 border-b">
            {Array(6).fill(null).map((_, colIndex) => (
              <div key={colIndex} className="p-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-[200px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
    </div>
  );
}

// Composant principal avec useSearchParams enveloppé dans Suspense
function UsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  useEffect(() => {
    // Récupérer les paramètres de l'URL
    const page = searchParams.get("page") ? parseInt(searchParams.get("page") as string) : 1;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    
    // Mettre à jour les états locaux avec les paramètres de l'URL
    setSearchTerm(search);
    setSelectedRole(role);
    setSelectedStatus(status);
    
    // Déclencher le chargement des données
    fetchUsers();
  }, [searchParams]);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Construire l'URL avec les paramètres de recherche
      const page = searchParams.get("page") || "1";
      const search = searchParams.get("search") || "";
      const role = searchParams.get("role") || "";
      const status = searchParams.get("status") || "";
      
      // Dans un environnement réel, vous feriez un appel API ici
      // Exemple: const response = await fetch(`/api/users?page=${page}&search=${search}&role=${role}&status=${status}`);
      
      // Pour cet exemple, nous générons des données factices
      setTimeout(() => {
        // Générer des données fictives
        const mockUsers: User[] = Array.from({ length: 10 }, (_, i) => ({
          id: `user-${i + 1}-${Date.now()}`,
          name: `Utilisateur ${i + 1}`,
          email: `user${i + 1}@example.com`,
          image: null,
          role: ["ADMIN", "CLIENT", "MERCHANT", "COURIER"][Math.floor(Math.random() * 4)],
          status: ["ACTIVE", "PENDING", "SUSPENDED"][Math.floor(Math.random() * 3)],
          createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
          lastLogin: Math.random() > 0.3 
            ? new Date(Date.now() - Math.random() * 1000000000) 
            : null,
        }));
        
        setUsers(mockUsers);
        setMeta({
          total: 57, // Nombre total fictif
          page: parseInt(page),
          limit: 10,
          totalPages: 6
        });
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      setLoading(false);
    }
  };
  
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedRole(null);
    setSelectedStatus(null);
    setDateRange(undefined);
  };
  
  const handleViewDetails = (id: string) => {
    router.push(`/admin/users/${id}`);
  };
  
  const handlePageChange = (newPage: number) => {
    router.push(`/admin/users?page=${newPage}`);
  };
  
  const handleFilterApply = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedRole) params.set("role", selectedRole);
    if (selectedStatus) params.set("status", selectedStatus);
    
    router.push(`/admin/users?${params.toString()}`);
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des utilisateurs</CardTitle>
            <CardDescription>
              Consultez et gérez les utilisateurs de la plateforme
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <UserFilters
            searchTerm={searchTerm}
            selectedRole={selectedRole}
            selectedStatus={selectedStatus}
            dateRange={dateRange}
            onSearchChange={setSearchTerm}
            onRoleChange={setSelectedRole}
            onStatusChange={setSelectedStatus}
            onDateRangeChange={setDateRange}
            onReset={handleResetFilters}
            onApply={handleFilterApply}
          />
          
          {loading ? (
            <div className="animate-pulse">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(5).fill(null).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-8 w-36 bg-gray-200 rounded"></div></TableCell>
                      <TableCell><div className="h-4 w-48 bg-gray-200 rounded"></div></TableCell>
                      <TableCell><div className="h-6 w-24 bg-gray-200 rounded"></div></TableCell>
                      <TableCell><div className="h-6 w-24 bg-gray-200 rounded"></div></TableCell>
                      <TableCell><div className="h-4 w-32 bg-gray-200 rounded"></div></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date d'inscription</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {users.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Aucun utilisateur trouvé.</p>
                </div>
              )}
            </>
          )}
          
          <UserPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={meta.limit}
            onPageChange={handlePageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type AdminUsersPageProps = Record<string, never>;

export default function AdminUsersPage(props: AdminUsersPageProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<UserTableSkeleton />}>
        <UsersPageContent />
      </Suspense>
    </div>
  );
} 