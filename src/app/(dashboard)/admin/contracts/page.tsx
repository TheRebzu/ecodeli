"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Icons
import { 
  Calendar, 
  ChevronDown, 
  Download, 
  Filter, 
  FileText, 
  MoreHorizontal, 
  Search, 
  Truck, 
  Store, 
  User,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

// Types
export type ContractStatus = 
  | "active" 
  | "pending" 
  | "expired" 
  | "terminated"
  | "draft";

export type ContractType = 
  | "delivery" 
  | "merchant" 
  | "provider";

export interface Contract {
  id: string;
  number: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  startDate: Date;
  endDate: Date;
  value: number;
  partnerId: string;
  partnerName: string;
  partnerType: "deliverer" | "merchant" | "provider";
  createdAt: Date;
  updatedAt: Date;
}

// Status configurations
const statusConfig: Record<ContractStatus, { color: string; label: string; icon: any }> = {
  active: { 
    color: "green", 
    label: "Actif", 
    icon: CheckCircle2 
  },
  pending: { 
    color: "yellow", 
    label: "En attente", 
    icon: Clock 
  },
  expired: { 
    color: "gray", 
    label: "Expiré", 
    icon: AlertCircle 
  },
  terminated: { 
    color: "red", 
    label: "Résilié", 
    icon: XCircle 
  },
  draft: { 
    color: "blue", 
    label: "Brouillon", 
    icon: FileText 
  }
};

// Contract type configurations
const contractTypeConfig: Record<ContractType, { color: string; label: string; icon: any }> = {
  delivery: { 
    color: "blue", 
    label: "Livraison", 
    icon: Truck 
  },
  merchant: { 
    color: "purple", 
    label: "Commerçant", 
    icon: Store 
  },
  provider: { 
    color: "orange", 
    label: "Prestataire", 
    icon: User 
  }
};

// Generate mock contracts
function generateMockContracts(count: number): Contract[] {
  const contracts: Contract[] = [];
  const contractTypes: ContractType[] = ["delivery", "merchant", "provider"];
  const statuses: ContractStatus[] = ["active", "pending", "expired", "terminated", "draft"];
  const partnerTypes = ["deliverer", "merchant", "provider"];
  
  for (let i = 0; i < count; i++) {
    const type = contractTypes[Math.floor(Math.random() * contractTypes.length)] as ContractType;
    const partnerType = partnerTypes[Math.floor(Math.random() * partnerTypes.length)] as "deliverer" | "merchant" | "provider";
    const status = statuses[Math.floor(Math.random() * statuses.length)] as ContractStatus;
    
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 365));
    
    const startDate = new Date(createdDate);
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
    
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1 + Math.floor(Math.random() * 2));
    
    contracts.push({
      id: `contract-${i + 1}`,
      number: `CONT-${2023 + Math.floor(i / 100)}-${1000 + i}`,
      title: `Contrat ${type === "delivery" ? "de livraison" : type === "merchant" ? "commerçant" : "prestataire"} ${1000 + i}`,
      type,
      status,
      startDate,
      endDate,
      value: Math.floor(Math.random() * 10000) + 1000,
      partnerId: `partner-${i + 1}`,
      partnerName: `Partenaire ${i + 1}`,
      partnerType,
      createdAt: createdDate,
      updatedAt: new Date(createdDate.getTime() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    });
  }
  
  return contracts;
}

// Contract Filters Component
function ContractFilters({
  searchTerm,
  setSearchTerm,
  selectedStatus,
  setSelectedStatus,
  selectedType,
  setSelectedType,
  dateRange,
  setDateRange
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedStatus: string | null;
  setSelectedStatus: (status: string | null) => void;
  selectedType: string | null;
  setSelectedType: (type: string | null) => void;
  dateRange: { start: Date | null; end: Date | null };
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
}) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contrat..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-row gap-2">
          <Select
            value={selectedStatus || ""}
            onValueChange={(value) => setSelectedStatus(value === "" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{selectedStatus ? statusConfig[selectedStatus as ContractStatus].label : "Statut"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les statuts</SelectItem>
              {Object.entries(statusConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedType || ""}
            onValueChange={(value) => setSelectedType(value === "" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{selectedType ? contractTypeConfig[selectedType as ContractType].label : "Type"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les types</SelectItem>
              {Object.entries(contractTypeConfig).map(([key, { label }]) => (
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

// Contract Row Component
function ContractRow({ contract }: { contract: Contract }) {
  const statusInfo = statusConfig[contract.status];
  const typeInfo = contractTypeConfig[contract.type];
  const router = useRouter();

  const handleViewDetails = () => {
    // Navigate to contract details page
    router.push(`/admin/contracts/${contract.id}`);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{contract.number}</TableCell>
      <TableCell>{contract.title}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`bg-${typeInfo.color}-50 text-${typeInfo.color}-700 border-${typeInfo.color}-200`}>
          <typeInfo.icon className="mr-1 h-3 w-3" />
          {typeInfo.label}
        </Badge>
      </TableCell>
      <TableCell>{contract.partnerName}</TableCell>
      <TableCell>{format(contract.startDate, "dd/MM/yyyy")}</TableCell>
      <TableCell>{format(contract.endDate, "dd/MM/yyyy")}</TableCell>
      <TableCell className="text-right">{contract.value.toLocaleString('fr-FR')} €</TableCell>
      <TableCell>
        <Badge variant="outline" className={`bg-${statusInfo.color}-50 text-${statusInfo.color}-700 border-${statusInfo.color}-200`}>
          <statusInfo.icon className="mr-1 h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>Voir détails</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert(`Télécharger ${contract.number}`)}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Contract Card Component
function ContractCard({ contract }: { contract: Contract }) {
  const statusInfo = statusConfig[contract.status];
  const typeInfo = contractTypeConfig[contract.type];
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/admin/contracts/${contract.id}`);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{contract.number}</h3>
            <p className="text-sm text-muted-foreground">{contract.title}</p>
          </div>
          <Badge variant="outline" className={`bg-${statusInfo.color}-50 text-${statusInfo.color}-700 border-${statusInfo.color}-200`}>
            <statusInfo.icon className="mr-1 h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Badge variant="outline" className={`bg-${typeInfo.color}-50 text-${typeInfo.color}-700 border-${typeInfo.color}-200`}>
              <typeInfo.icon className="mr-1 h-3 w-3" />
              {typeInfo.label}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Partenaire:</span>
            <span className="text-sm font-medium">{contract.partnerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Période:</span>
            <span className="text-sm">
              {format(contract.startDate, "dd/MM/yyyy")} - {format(contract.endDate, "dd/MM/yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Valeur:</span>
            <span className="text-sm font-medium">{contract.value.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="default" className="w-full" onClick={handleViewDetails}>
          Voir détails
        </Button>
      </CardFooter>
    </Card>
  );
}

// Pagination Component
function ContractPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange
}: {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-sm text-muted-foreground">
        Affichage de {Math.min((currentPage - 1) * pageSize + 1, totalItems)} à {Math.min(currentPage * pageSize, totalItems)} sur {totalItems} contrats
      </div>
      <div className="flex items-center space-x-2">
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
  );
}

// Main Page Component
export default function AdminContractsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Generate mock contracts
  const contracts = generateMockContracts(50);
  
  // Filter contracts based on search and filters
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = 
      searchTerm === "" ||
      contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.partnerName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = 
      !selectedStatus || contract.status === selectedStatus;
      
    const matchesType = 
      !selectedType || contract.type === selectedType;
      
    const matchesDateRange =
      (!dateRange.start || contract.startDate >= dateRange.start) &&
      (!dateRange.end || contract.endDate <= dateRange.end);
      
    return matchesSearch && matchesStatus && matchesType && matchesDateRange;
  });
  
  // Get current page items
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = filteredContracts.slice(indexOfFirstItem, indexOfLastItem);
  
  // Change page
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  const handleCreateContract = () => {
    router.push("/admin/contracts/create");
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contrats</h1>
          <p className="text-muted-foreground">
            Gérez les contrats avec les livreurs, commerçants et prestataires.
          </p>
        </div>
        <Button onClick={handleCreateContract}>
          <FileText className="mr-2 h-4 w-4" />
          Nouveau contrat
        </Button>
      </div>
      
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <ContractFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
          
          <Tabs defaultValue={viewMode} onValueChange={(value) => setViewMode(value as "table" | "cards")}>
            <TabsList>
              <TabsTrigger value="table">Tableau</TabsTrigger>
              <TabsTrigger value="cards">Cartes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/20">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-1">Aucun contrat trouvé</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Aucun contrat ne correspond à vos critères de recherche. Veuillez ajuster vos filtres ou créer un nouveau contrat.
            </p>
            <Button className="mt-4" onClick={handleCreateContract}>
              Créer un contrat
            </Button>
          </div>
        ) : viewMode === "table" ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((contract) => (
                  <ContractRow key={contract.id} contract={contract} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentItems.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </div>
        )}
        
        <ContractPagination
          currentPage={currentPage}
          totalItems={filteredContracts.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
