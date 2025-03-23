"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  Filter,
  MoreHorizontal,
  Map,
  Package,
  MapPin,
  User,
  Clock,
  CalendarClock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Store,
  Eye,
  History,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

// Types
type ShipmentStatus = 
  | "pending" 
  | "accepted" 
  | "in_progress" 
  | "delivered" 
  | "cancelled" 
  | "failed";

type ShipmentPriority = "low" | "normal" | "high" | "urgent";

type ShipmentType = "standard" | "express" | "refrigerated" | "fragile" | "bulk";

interface Shipment {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  priority: ShipmentPriority;
  type: ShipmentType;
  pickupAddress: string;
  pickupPostalCode: string;
  pickupCity: string;
  deliveryAddress: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  distance: number;
  estimatedTime: number; // in minutes
  scheduledAt: Date;
  pickupAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customerId: string;
  customerName: string;
  merchantId: string | null;
  merchantName: string | null;
  delivererId: string | null;
  delivererName: string | null;
  packageWeight: number; // in kg
  packageDimensions: {
    length: number;
    width: number;
    height: number;
  } | null;
  price: number;
  notes: string | null;
}

// Status configuration
const STATUS_CONFIG: Record<ShipmentStatus, { color: string; label: string; icon: any }> = {
  pending: {
    color: "yellow",
    label: "En attente",
    icon: Clock,
  },
  accepted: {
    color: "blue",
    label: "Acceptée",
    icon: CheckCircle,
  },
  in_progress: {
    color: "indigo",
    label: "En cours",
    icon: Truck,
  },
  delivered: {
    color: "green",
    label: "Livrée",
    icon: CheckCircle,
  },
  cancelled: {
    color: "red",
    label: "Annulée",
    icon: XCircle,
  },
  failed: {
    color: "gray",
    label: "Échouée",
    icon: AlertTriangle,
  },
};

// Priority configuration
const PRIORITY_CONFIG: Record<ShipmentPriority, { color: string; label: string }> = {
  low: {
    color: "gray",
    label: "Basse",
  },
  normal: {
    color: "blue",
    label: "Normale",
  },
  high: {
    color: "orange",
    label: "Haute",
  },
  urgent: {
    color: "red",
    label: "Urgente",
  },
};

// Type configuration
const TYPE_CONFIG: Record<ShipmentType, { color: string; label: string; icon: any }> = {
  standard: {
    color: "blue",
    label: "Standard",
    icon: Package,
  },
  express: {
    color: "red",
    label: "Express",
    icon: Truck,
  },
  refrigerated: {
    color: "cyan",
    label: "Réfrigérée",
    icon: Package,
  },
  fragile: {
    color: "purple",
    label: "Fragile",
    icon: Package,
  },
  bulk: {
    color: "amber",
    label: "Volumineuse",
    icon: Package,
  },
};

// Generate mock shipments data
function generateMockShipments(count: number): Shipment[] {
  const cities = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse", "Nantes", "Strasbourg"];
  const streets = ["Rue de la Paix", "Avenue des Champs-Élysées", "Boulevard Saint-Michel", "Place de la République", "Rue du Faubourg Saint-Honoré"];
  const shipmentTypes: ShipmentType[] = ["standard", "express", "refrigerated", "fragile", "bulk"];
  const priorities: ShipmentPriority[] = ["low", "normal", "high", "urgent"];
  const statuses: ShipmentStatus[] = ["pending", "accepted", "in_progress", "delivered", "cancelled", "failed"];
  
  return Array.from({ length: count }).map((_, i) => {
    // Generate random status
    const status = statuses[Math.floor(Math.random() * statuses.length)] as ShipmentStatus;
    
    // Generate dates based on status
    const today = new Date();
    const createdAt = new Date(today);
    createdAt.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Random date in the last 30 days
    
    const scheduledAt = new Date(createdAt);
    scheduledAt.setHours(createdAt.getHours() + Math.floor(Math.random() * 48)); // 0-48 hours after creation
    
    let pickupAt: Date | null = null;
    let deliveredAt: Date | null = null;
    
    if (status === "in_progress" || status === "delivered" || status === "failed") {
      pickupAt = new Date(scheduledAt);
      pickupAt.setMinutes(scheduledAt.getMinutes() + Math.floor(Math.random() * 60)); // 0-60 minutes after scheduled
    }
    
    if (status === "delivered" || status === "failed") {
      deliveredAt = new Date(pickupAt!);
      deliveredAt.setMinutes(pickupAt!.getMinutes() + Math.floor(Math.random() * 120)); // 0-120 minutes after pickup
    }
    
    // Random cities and addresses
    const pickupCity = cities[Math.floor(Math.random() * cities.length)];
    const deliveryCity = cities[Math.floor(Math.random() * cities.length)];
    const pickupStreet = streets[Math.floor(Math.random() * streets.length)];
    const deliveryStreet = streets[Math.floor(Math.random() * streets.length)];
    
    // Random distance based on cities (same city = short distance)
    const isSameCity = pickupCity === deliveryCity;
    const distance = isSameCity 
      ? Math.floor(Math.random() * 5) + 1 // 1-5 km within the same city
      : Math.floor(Math.random() * 400) + 50; // 50-450 km between different cities
    
    // Generate estimated time based on distance and type
    const type = shipmentTypes[Math.floor(Math.random() * shipmentTypes.length)] as ShipmentType;
    const baseSpeed = type === "express" ? 1 : 0.5; // km/minute
    const estimatedTime = Math.floor(distance / baseSpeed) + Math.floor(Math.random() * 30); // Add 0-30 minutes of randomness
    
    // Generate package weight and dimensions
    const packageWeight = Math.floor(Math.random() * 20) + 0.5; // 0.5-20.5 kg
    
    const hasDimensions = Math.random() > 0.2; // 80% chance of having dimensions
    const packageDimensions = hasDimensions 
      ? {
          length: Math.floor(Math.random() * 50) + 10, // 10-60 cm
          width: Math.floor(Math.random() * 40) + 5, // 5-45 cm
          height: Math.floor(Math.random() * 30) + 5, // 5-35 cm
        }
      : null;
    
    // Generate price based on distance, type, and weight
    const basePrice = 5; // Base fee
    const distancePrice = distance * 0.1; // 0.1€ per km
    const weightPrice = packageWeight * 0.5; // 0.5€ per kg
    const typeMultiplier = type === "express" ? 1.5 : type === "refrigerated" ? 1.3 : type === "fragile" ? 1.2 : 1;
    const price = Math.round((basePrice + distancePrice + weightPrice) * typeMultiplier * 100) / 100;
    
    // Random priority with higher probability for normal
    const random = Math.random();
    let priority: ShipmentPriority;
    if (random < 0.1) priority = "urgent";
    else if (random < 0.3) priority = "high";
    else if (random < 0.8) priority = "normal";
    else priority = "low";
    
    // Generate merchant data (70% of shipments have merchants)
    const hasMerchant = Math.random() < 0.7;
    const merchantId = hasMerchant ? `merchant-${Math.floor(Math.random() * 20) + 1}` : null;
    const merchantName = merchantId ? `Commerçant ${merchantId.split('-')[1]}` : null;
    
    // Generate deliverer data (if shipment is accepted, in progress, or delivered)
    const hasDeliverer = ["accepted", "in_progress", "delivered", "failed"].includes(status);
    const delivererId = hasDeliverer ? `deliverer-${Math.floor(Math.random() * 30) + 1}` : null;
    const delivererName = delivererId ? `Livreur ${delivererId.split('-')[1]}` : null;
    
    // Random notes (30% chance of having notes)
    const hasNotes = Math.random() < 0.3;
    const notes = hasNotes ? [
      "Appeler avant livraison",
      "Code porte: 1234",
      "Livrer à l'arrière du bâtiment",
      "Contacter le concierge pour l'accès",
      "Attention animal de compagnie",
    ][Math.floor(Math.random() * 5)] : null;
    
    // Correction: calcul de la date de mise à jour
    const dates = [createdAt, scheduledAt];
    if (pickupAt) dates.push(pickupAt);
    if (deliveredAt) dates.push(deliveredAt);
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      id: `shipment-${i + 1}`,
      trackingNumber: `ECO-${createdAt.getFullYear().toString().substring(2)}${createdAt.getMonth() + 1}${createdAt.getDate()}-${100000 + i}`,
      status,
      priority,
      type,
      pickupAddress: `${Math.floor(Math.random() * 100) + 1} ${pickupStreet}`,
      pickupPostalCode: `${10000 + Math.floor(Math.random() * 90000)}`,
      pickupCity,
      deliveryAddress: `${Math.floor(Math.random() * 100) + 1} ${deliveryStreet}`,
      deliveryPostalCode: `${10000 + Math.floor(Math.random() * 90000)}`,
      deliveryCity,
      distance,
      estimatedTime,
      scheduledAt,
      pickupAt,
      deliveredAt,
      createdAt,
      updatedAt: latestDate,
      customerId: `customer-${Math.floor(Math.random() * 100) + 1}`,
      customerName: `Client ${Math.floor(Math.random() * 100) + 1}`,
      merchantId,
      merchantName,
      delivererId,
      delivererName,
      packageWeight,
      packageDimensions,
      price,
      notes,
    };
  });
}

// Generate mock data
const mockShipments = generateMockShipments(50);

// Shipment Filter Component
function ShipmentFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  priorityFilter,
  setPriorityFilter,
  dateRange,
  setDateRange,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: ShipmentStatus | "all";
  setStatusFilter: (status: ShipmentStatus | "all") => void;
  typeFilter: ShipmentType | "all";
  setTypeFilter: (type: ShipmentType | "all") => void;
  priorityFilter: ShipmentPriority | "all";
  setPriorityFilter: (priority: ShipmentPriority | "all") => void;
  dateRange: { start: Date | null; end: Date | null };
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par numéro, client ou adresse..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-row gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ShipmentStatus | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as ShipmentType | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value as ShipmentPriority | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Shipment Row Component
function ShipmentRow({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const { status, type, priority } = shipment;
  
  const statusConfig = STATUS_CONFIG[status];
  const typeConfig = TYPE_CONFIG[type];
  const priorityConfig = PRIORITY_CONFIG[priority];
  
  const handleViewDetails = () => {
    router.push(`/admin/shipments/${shipment.id}`);
  };
  
  return (
    <TableRow>
      <TableCell className="font-medium">{shipment.trackingNumber}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Badge className={`bg-${statusConfig.color}-100 text-${statusConfig.color}-800 flex items-center gap-1`}>
            <statusConfig.icon className="h-3 w-3" />
            <span>{statusConfig.label}</span>
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge className={`bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
            {typeConfig.label}
          </Badge>
          <Badge className={`bg-${priorityConfig.color}-100 text-${priorityConfig.color}-800`}>
            {priorityConfig.label}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <div className="font-medium">{shipment.customerName}</div>
          {shipment.merchantName && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Store className="h-3 w-3" />
              {shipment.merchantName}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span>{shipment.pickupCity}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span>{shipment.deliveryCity}</span>
          </div>
          <div className="text-xs text-muted-foreground">{shipment.distance} km</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3 text-muted-foreground" />
            <span>{format(shipment.scheduledAt, "dd/MM/yyyy HH:mm")}</span>
          </div>
          {shipment.pickupAt && (
            <div className="text-xs text-muted-foreground">
              Collecté: {format(shipment.pickupAt, "HH:mm")}
            </div>
          )}
          {shipment.deliveredAt && (
            <div className="text-xs text-muted-foreground">
              Livré: {format(shipment.deliveredAt, "HH:mm")}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        {shipment.delivererId ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback>
                {shipment.delivererName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <span>{shipment.delivererName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Non assigné</span>
        )}
      </TableCell>
      <TableCell className="text-right font-medium">{shipment.price.toFixed(2)} €</TableCell>
      <TableCell>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Voir détails
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Map className="h-4 w-4 mr-2" />
                Voir sur la carte
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="h-4 w-4 mr-2" />
                Historique
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Shipment Card Component
function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const { status, type, priority } = shipment;
  
  const statusConfig = STATUS_CONFIG[status];
  const typeConfig = TYPE_CONFIG[type];
  const priorityConfig = PRIORITY_CONFIG[priority];
  
  const handleViewDetails = () => {
    router.push(`/admin/shipments/${shipment.id}`);
  };
  
  // Calculate progress for in-progress shipments
  let progress = 0;
  if (status === "delivered") {
    progress = 100;
  } else if (status === "in_progress" && shipment.pickupAt) {
    const totalTime = shipment.estimatedTime * 60 * 1000; // Convert minutes to ms
    const elapsedTime = Date.now() - shipment.pickupAt.getTime();
    progress = Math.min(Math.floor((elapsedTime / totalTime) * 100), 95);
  } else if (status === "accepted") {
    progress = 25;
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{shipment.trackingNumber}</CardTitle>
            <CardDescription>
              {format(shipment.scheduledAt, "dd/MM/yyyy HH:mm")}
            </CardDescription>
          </div>
          <Badge className={`bg-${statusConfig.color}-100 text-${statusConfig.color}-800 flex items-center gap-1`}>
            <statusConfig.icon className="h-3 w-3" />
            <span>{statusConfig.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <div className="grid grid-cols-2 gap-y-2 mb-3">
          <div className="text-sm text-muted-foreground">Client:</div>
          <div className="text-sm font-medium">{shipment.customerName}</div>
          
          {shipment.merchantName && (
            <>
              <div className="text-sm text-muted-foreground">Commerçant:</div>
              <div className="text-sm font-medium">{shipment.merchantName}</div>
            </>
          )}
          
          <div className="text-sm text-muted-foreground">Trajet:</div>
          <div className="text-sm">{shipment.distance} km</div>
          
          <div className="text-sm text-muted-foreground">Prix:</div>
          <div className="text-sm font-medium">{shipment.price.toFixed(2)} €</div>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <div className="text-xs text-muted-foreground">Départ</div>
            <div className="text-sm font-medium">{shipment.pickupCity}</div>
          </div>
          <div className="w-1/3 h-1 relative">
            <div className="h-1 bg-gray-200 rounded-full w-full"></div>
            {(status === "in_progress" || status === "accepted" || status === "delivered") && (
              <div 
                className={`h-1 absolute top-0 left-0 rounded-full bg-${statusConfig.color}-500`} 
                style={{ width: `${progress}%` }}
              ></div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-muted-foreground">Arrivée</div>
            <div className="text-sm font-medium">{shipment.deliveryCity}</div>
          </div>
        </div>
        
        <div className="flex gap-1 mb-3">
          <Badge className={`bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
            {typeConfig.label}
          </Badge>
          <Badge className={`bg-${priorityConfig.color}-100 text-${priorityConfig.color}-800`}>
            {priorityConfig.label}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{shipment.estimatedTime} min</span>
          </div>
          <div>
            {shipment.delivererId ? (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{shipment.delivererName}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">Non assigné</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" onClick={handleViewDetails}>
          Voir détails
        </Button>
      </CardFooter>
    </Card>
  );
}

// Main Page Component
export default function AdminShipmentsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ShipmentType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<ShipmentPriority | "all">("all");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [sortField, setSortField] = useState<"date" | "price" | "distance">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter shipments based on filters
  const filteredShipments = mockShipments.filter((shipment) => {
    const matchesSearch =
      searchTerm === "" ||
      shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.pickupCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.deliveryCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shipment.merchantName && shipment.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (shipment.delivererName && shipment.delivererName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    const matchesType = typeFilter === "all" || shipment.type === typeFilter;
    const matchesPriority = priorityFilter === "all" || shipment.priority === priorityFilter;
    
    const matchesDateRange =
      (!dateRange.start || shipment.scheduledAt >= dateRange.start) &&
      (!dateRange.end || shipment.scheduledAt <= dateRange.end);
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesDateRange;
  });
  
  // Sort shipments
  const sortedShipments = [...filteredShipments].sort((a, b) => {
    const factor = sortDirection === "asc" ? 1 : -1;
    
    switch (sortField) {
      case "date":
        return (a.scheduledAt.getTime() - b.scheduledAt.getTime()) * factor;
      case "price":
        return (a.price - b.price) * factor;
      case "distance":
        return (a.distance - b.distance) * factor;
      default:
        return 0;
    }
  });
  
  // Pagination
  const totalPages = Math.ceil(sortedShipments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleShipments = sortedShipments.slice(startIndex, startIndex + itemsPerPage);
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  const handleSortChange = (field: "date" | "price" | "distance") => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  // Count shipments by status
  const shipmentCounts = mockShipments.reduce(
    (acc, shipment) => {
      acc[shipment.status] = (acc[shipment.status] || 0) + 1;
      return acc;
    },
    {} as Record<ShipmentStatus, number>
  );
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expéditions</h1>
          <p className="text-muted-foreground">
            Gérez les expéditions, assignez des livreurs et suivez les livraisons
          </p>
        </div>
        <Button onClick={() => router.push("/admin/shipments/create")}>
          Créer une expédition
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, { label, color, icon: Icon }]) => {
          const count = shipmentCounts[key as ShipmentStatus] || 0;
          const percentage = Math.round((count / mockShipments.length) * 100);
          
          return (
            <Card key={key} className={`border-l-4 border-l-${color}-500`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-2xl font-bold mt-1">{count}</div>
                  </div>
                  <div className={`p-2 rounded-md bg-${color}-100`}>
                    <Icon className={`h-4 w-4 text-${color}-600`} />
                  </div>
                </div>
                <div className="mt-2">
                  <Progress value={percentage} className={`h-1 bg-${color}-100`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <Tabs defaultValue={viewMode} onValueChange={(value) => setViewMode(value as "table" | "grid")}>
        <div className="flex justify-between items-center">
          <ShipmentFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
          
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="table">Tableau</TabsTrigger>
              <TabsTrigger value="grid">Cartes</TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        {filteredShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border rounded-md mt-4">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune expédition trouvée</h3>
            <p className="text-muted-foreground text-center mb-4">
              Aucune expédition ne correspond à vos critères de recherche.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTypeFilter("all");
                setPriorityFilter("all");
                setDateRange({ start: null, end: null });
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : viewMode === "table" ? (
          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Expédition</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Trajet</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSortChange("date")}>
                      <span>Date</span>
                      {sortField === "date" && (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Livreur</TableHead>
                  <TableHead>
                    <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSortChange("price")}>
                      <span>Prix</span>
                      {sortField === "price" && (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleShipments.map((shipment) => (
                  <ShipmentRow key={shipment.id} shipment={shipment} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {visibleShipments.map((shipment) => (
              <ShipmentCard key={shipment.id} shipment={shipment} />
            ))}
          </div>
        )}
      </Tabs>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredShipments.length)} sur {filteredShipments.length} expéditions
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}