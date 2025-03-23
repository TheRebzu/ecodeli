"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";

// Icons
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  MoreHorizontal, 
  Search, 
  SlidersHorizontal, 
  Clock,
  CheckCircle,
  XCircle,
  TruckIcon,
  Eye,
  PackageOpen,
  Printer,
  Send
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Types
type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
type PaymentStatus = 'PAID' | 'UNPAID' | 'REFUNDED';

type OrderType = {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  total: number;
  items: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
};

// Status badge configuration
const ORDER_STATUS_COLORS = {
  'PENDING': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'PROCESSING': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  'SHIPPED': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  'DELIVERED': 'bg-green-100 text-green-800 hover:bg-green-100',
  'CANCELLED': 'bg-red-100 text-red-800 hover:bg-red-100',
  'REFUNDED': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
};

const PAYMENT_STATUS_COLORS = {
  'PAID': 'bg-green-100 text-green-800 hover:bg-green-100',
  'UNPAID': 'bg-red-100 text-red-800 hover:bg-red-100',
  'REFUNDED': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
};

// Translations
const ORDER_STATUS_TRANSLATIONS = {
  'PENDING': 'En attente',
  'PROCESSING': 'En préparation',
  'SHIPPED': 'Expédiée',
  'DELIVERED': 'Livrée',
  'CANCELLED': 'Annulée',
  'REFUNDED': 'Remboursée',
};

const PAYMENT_STATUS_TRANSLATIONS = {
  'PAID': 'Payée',
  'UNPAID': 'Non payée',
  'REFUNDED': 'Remboursée',
};

// Components
type FiltersProps = {
  searchTerm: string;
  selectedStatus: OrderStatus | null;
  selectedPaymentStatus: PaymentStatus | null;
  dateRange: DateRange | undefined;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: OrderStatus | null) => void;
  onPaymentStatusChange: (value: PaymentStatus | null) => void;
  onDateRangeChange: (value: DateRange | undefined) => void;
  onReset: () => void;
  onApply: () => void;
}

function OrderFilters({
  searchTerm,
  selectedStatus,
  selectedPaymentStatus,
  dateRange,
  onSearchChange,
  onStatusChange,
  onPaymentStatusChange,
  onDateRangeChange,
  onReset,
  onApply
}: FiltersProps) {
  const activeFiltersCount = [
    selectedStatus, 
    selectedPaymentStatus, 
    dateRange
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une commande..."
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
                    Statut de commande
                  </label>
                  <Select
                    value={selectedStatus || ""}
                    onValueChange={(value) => onStatusChange(value as OrderStatus || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      {Object.entries(ORDER_STATUS_TRANSLATIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label htmlFor="paymentStatus" className="text-sm font-medium">
                    Statut de paiement
                  </label>
                  <Select
                    value={selectedPaymentStatus || ""}
                    onValueChange={(value) => onPaymentStatusChange(value as PaymentStatus || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      {Object.entries(PAYMENT_STATUS_TRANSLATIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Date de commande</label>
                  <DatePickerWithRange 
                    date={dateRange}
                    setDate={onDateRangeChange}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
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
      
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9">
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>
    </div>
  );
}

// Mock data
const MOCK_ORDERS: OrderType[] = Array.from({ length: 25 }).map((_, i) => ({
  id: `order-${i+1}`,
  orderNumber: `ORD-${10000 + i}`,
  customer: {
    id: `customer-${i+1}`,
    name: `Client ${i+1}`,
    email: `client${i+1}@example.com`,
    image: i % 3 === 0 ? `https://ui-avatars.com/api/?name=C${i}&background=random` : undefined,
  },
  total: Math.floor(Math.random() * 20000) / 100 + 10,
  items: Math.floor(Math.random() * 5) + 1,
  status: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'][Math.floor(Math.random() * 6)] as OrderStatus,
  paymentStatus: ['PAID', 'UNPAID', 'REFUNDED'][Math.floor(Math.random() * 3)] as PaymentStatus,
  createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
}));

// Component for order row
type OrderRowProps = {
  order: OrderType;
  onViewDetails: (id: string) => void;
}

function OrderRow({ order, onViewDetails }: OrderRowProps) {
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return <Clock className="mr-2 h-4 w-4" />;
      case 'PROCESSING': return <PackageOpen className="mr-2 h-4 w-4" />;
      case 'SHIPPED': return <TruckIcon className="mr-2 h-4 w-4" />;
      case 'DELIVERED': return <CheckCircle className="mr-2 h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="mr-2 h-4 w-4" />;
      case 'REFUNDED': return <Send className="mr-2 h-4 w-4" />;
      default: return <Clock className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{order.orderNumber}</div>
        <div className="text-xs text-muted-foreground">
          {format(order.createdAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={order.customer.image} alt={order.customer.name} />
            <AvatarFallback>
              {order.customer.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{order.customer.name}</div>
            <div className="text-xs text-muted-foreground">{order.customer.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{order.total.toFixed(2)} €</div>
        <div className="text-xs text-muted-foreground">{order.items} article{order.items > 1 ? 's' : ''}</div>
      </TableCell>
      <TableCell>
        <Badge className={`${ORDER_STATUS_COLORS[order.status]} border-none`}>
          {getStatusIcon(order.status)}
          {ORDER_STATUS_TRANSLATIONS[order.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={`${PAYMENT_STATUS_COLORS[order.paymentStatus]} border-none`}>
          {PAYMENT_STATUS_TRANSLATIONS[order.paymentStatus]}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(order.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Voir les détails
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer la facture
            </DropdownMenuItem>
            {order.status === 'PENDING' && (
              <DropdownMenuItem>
                <PackageOpen className="mr-2 h-4 w-4" />
                Marquer en préparation
              </DropdownMenuItem>
            )}
            {order.status === 'PROCESSING' && (
              <DropdownMenuItem>
                <TruckIcon className="mr-2 h-4 w-4" />
                Marquer comme expédiée
              </DropdownMenuItem>
            )}
            {order.status === 'SHIPPED' && (
              <DropdownMenuItem>
                <CheckCircle className="mr-2 h-4 w-4" />
                Marquer comme livrée
              </DropdownMenuItem>
            )}
            {['PENDING', 'PROCESSING'].includes(order.status) && (
              <DropdownMenuItem className="text-red-600">
                <XCircle className="mr-2 h-4 w-4" />
                Annuler la commande
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Pagination component
type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function OrderPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        Affichage de {startItem} à {endItem} sur {totalItems} commandes
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          Page {currentPage} sur {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Main page component
type AdminOrdersPageProps = Record<string, never>;

export function AdminOrdersPage(props: AdminOrdersPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const router = useRouter();

  // Filter data based on criteria
  const filteredData = MOCK_ORDERS.filter(order => {
    const searchContent = [
      order.orderNumber,
      order.customer.name,
      order.customer.email,
    ].join(" ").toLowerCase();
    
    const isMatchingSearch = !searchTerm || searchContent.includes(searchTerm.toLowerCase());
    const isMatchingStatus = !selectedStatus || order.status === selectedStatus;
    const isMatchingPaymentStatus = !selectedPaymentStatus || order.paymentStatus === selectedPaymentStatus;
    
    let isMatchingDateRange = true;
    if (dateRange?.from && dateRange?.to) {
      isMatchingDateRange = 
        order.createdAt >= dateRange.from && 
        order.createdAt <= dateRange.to;
    }
    
    return isMatchingSearch && isMatchingStatus && isMatchingPaymentStatus && isMatchingDateRange;
  });

  // Sort orders by date (newest first)
  const sortedData = [...filteredData].sort((a, b) => 
    b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedStatus(null);
    setSelectedPaymentStatus(null);
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/admin/orders/${id}`);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleFilterApply = () => {
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des commandes</h2>
          <p className="text-muted-foreground">
            Gérez les commandes de la plateforme
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Commandes</CardTitle>
          <CardDescription>
            {filteredData.length} commande{filteredData.length > 1 ? 's' : ''} trouvée{filteredData.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderFilters
            searchTerm={searchTerm}
            selectedStatus={selectedStatus}
            selectedPaymentStatus={selectedPaymentStatus}
            dateRange={dateRange}
            onSearchChange={setSearchTerm}
            onStatusChange={setSelectedStatus}
            onPaymentStatusChange={setSelectedPaymentStatus}
            onDateRangeChange={setDateRange}
            onReset={handleResetFilters}
            onApply={handleFilterApply}
          />
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((order) => (
                    <OrderRow 
                      key={order.id}
                      order={order}
                      onViewDetails={handleViewDetails}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Aucune commande trouvée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredData.length > 0 && (
            <OrderPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredData.length}
              pageSize={itemsPerPage}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminOrdersPage; 