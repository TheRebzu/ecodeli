"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Icons
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Plus,
  Edit,
  Trash2,
  Eye,
  ImageIcon,
  Tag,
  ArrowUpDown,
  Check,
  X
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

// Types
type ProductCategory = 'MAIN_COURSE' | 'STARTER' | 'DESSERT' | 'DRINK' | 'SNACK';
type ProductStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'DRAFT' | 'ARCHIVED';

type ProductType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  category: ProductCategory;
  status: ProductStatus;
  image: string;
  inventory: number;
  createdAt: Date;
  updatedAt: Date;
  featured: boolean;
};

// Status and category configurations
const PRODUCT_STATUS_COLORS = {
  'ACTIVE': 'bg-green-100 text-green-800 hover:bg-green-100',
  'OUT_OF_STOCK': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'DRAFT': 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  'ARCHIVED': 'bg-red-100 text-red-800 hover:bg-red-100',
};

const PRODUCT_CATEGORY_COLORS = {
  'MAIN_COURSE': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  'STARTER': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  'DESSERT': 'bg-pink-100 text-pink-800 hover:bg-pink-100',
  'DRINK': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
  'SNACK': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
};

// Translations
const PRODUCT_STATUS_TRANSLATIONS = {
  'ACTIVE': 'Actif',
  'OUT_OF_STOCK': 'Rupture de stock',
  'DRAFT': 'Brouillon',
  'ARCHIVED': 'Archivé',
};

const PRODUCT_CATEGORY_TRANSLATIONS = {
  'MAIN_COURSE': 'Plat principal',
  'STARTER': 'Entrée',
  'DESSERT': 'Dessert',
  'DRINK': 'Boisson',
  'SNACK': 'Snack',
};

// Components
type FiltersProps = {
  searchTerm: string;
  selectedCategory: ProductCategory | null;
  selectedStatus: ProductStatus | null;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: ProductCategory | null) => void;
  onStatusChange: (value: ProductStatus | null) => void;
  onReset: () => void;
  onApply: () => void;
}

function ProductFilters({
  searchTerm,
  selectedCategory,
  selectedStatus,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onReset,
  onApply
}: FiltersProps) {
  const activeFiltersCount = [
    selectedCategory,
    selectedStatus
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
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
                    onValueChange={(value) => onStatusChange(value as ProductStatus || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      {Object.entries(PRODUCT_STATUS_TRANSLATIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Catégorie
                  </label>
                  <Select
                    value={selectedCategory || ""}
                    onValueChange={(value) => onCategoryChange(value as ProductCategory || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les catégories</SelectItem>
                      {Object.entries(PRODUCT_CATEGORY_TRANSLATIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau produit
        </Button>
      </div>
    </div>
  );
}

// Mock data
const MOCK_PRODUCTS: ProductType[] = Array.from({ length: 15 }).map((_, i) => {
  const categories: ProductCategory[] = ['MAIN_COURSE', 'STARTER', 'DESSERT', 'DRINK', 'SNACK'];
  const statuses: ProductStatus[] = ['ACTIVE', 'OUT_OF_STOCK', 'DRAFT', 'ARCHIVED'];
  const productNames = [
    "Salade César",
    "Burger Végétarien",
    "Poke Bowl Saumon",
    "Pasta Carbonara",
    "Smoothie Fruits Rouges",
    "Bowl Buddha",
    "Pizza Margherita",
    "Jus d'Orange Frais",
    "Tiramisu",
    "Curry Légumes",
    "Soupe Miso",
    "Brownie Chocolat",
    "Wrap Poulet",
    "Café Latte",
    "Salade de Fruits"
  ];
  
  const name = productNames[i];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const price = Math.floor(Math.random() * 1500) / 100 + 3;
  const salePrice = Math.random() > 0.7 ? price * 0.8 : null;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  
  return {
    id: `product-${i+1}`,
    name,
    slug,
    description: `Description pour ${name}`,
    price,
    salePrice,
    category,
    status,
    image: `https://loremflickr.com/320/240/food?lock=${i+1}`,
    inventory: Math.floor(Math.random() * 100),
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
    featured: Math.random() > 0.8,
  };
});

// Component for product row
type ProductRowProps = {
  product: ProductType;
  onViewDetails: (id: string) => void;
  isSelected: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
}

function ProductRow({ product, onViewDetails, isSelected, onSelectChange }: ProductRowProps) {
  return (
    <TableRow className={isSelected ? "bg-muted/30" : ""}>
      <TableCell className="w-12">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelectChange(product.id, !!checked)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-md">
            <AvatarImage src={product.image} alt={product.name} className="object-cover" />
            <AvatarFallback className="rounded-md">
              <ImageIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{product.name}</div>
            <div className="text-xs text-muted-foreground">{product.slug}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={`${PRODUCT_CATEGORY_COLORS[product.category]} border-none`}>
          {PRODUCT_CATEGORY_TRANSLATIONS[product.category]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">
          {product.salePrice ? (
            <>
              <span className="text-muted-foreground line-through mr-2">
                {product.price.toFixed(2)} €
              </span>
              <span className="text-red-600">{product.salePrice.toFixed(2)} €</span>
            </>
          ) : (
            <span>{product.price.toFixed(2)} €</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          {product.status === 'ACTIVE' ? (
            <>
              <span className="text-sm">{product.inventory}</span>
              {product.inventory < 10 && product.inventory > 0 && (
                <Badge variant="outline" className="ml-2 text-amber-500 border-amber-200 bg-amber-50">Faible</Badge>
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={`${PRODUCT_STATUS_COLORS[product.status]} border-none`}>
          {PRODUCT_STATUS_TRANSLATIONS[product.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          {product.featured ? (
            <div className="flex items-center text-amber-500">
              <Check className="h-4 w-4 mr-1" />
              <span>Oui</span>
            </div>
          ) : (
            <div className="flex items-center text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              <span>Non</span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(product.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Voir les détails
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            {product.status !== 'ACTIVE' && (
              <DropdownMenuItem>
                <Check className="mr-2 h-4 w-4" />
                Activer
              </DropdownMenuItem>
            )}
            {product.status === 'ACTIVE' && (
              <DropdownMenuItem>
                <Tag className="mr-2 h-4 w-4" />
                {product.featured ? "Retirer des produits en avant" : "Mettre en avant"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {product.status !== 'ARCHIVED' && (
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Archiver
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
  selectedCount: number;
}

function ProductPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  selectedCount
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        {selectedCount > 0 ? (
          <div className="flex gap-2">
            <span>{selectedCount} produit{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}</span>
            <Button variant="outline" size="sm">Actions groupées</Button>
          </div>
        ) : (
          <span>Affichage de {startItem} à {endItem} sur {totalItems} produits</span>
        )}
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
type AdminProductsPageProps = Record<string, never>;

export function AdminProductsPage(props: AdminProductsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<keyof ProductType | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;

  const router = useRouter();

  // Filter data based on criteria
  const filteredData = MOCK_PRODUCTS.filter(product => {
    const searchContent = [
      product.name,
      product.description,
      product.slug,
    ].join(" ").toLowerCase();
    
    const isMatchingSearch = !searchTerm || searchContent.includes(searchTerm.toLowerCase());
    const isMatchingCategory = !selectedCategory || product.category === selectedCategory;
    const isMatchingStatus = !selectedStatus || product.status === selectedStatus;
    
    return isMatchingSearch && isMatchingCategory && isMatchingStatus;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue === bValue) return 0;
    
    // Handle different types of values
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }
    
    if (aValue === null) return sortDirection === 'asc' ? -1 : 1;
    if (bValue === null) return sortDirection === 'asc' ? 1 : -1;
    
    return sortDirection === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory(null);
    setSelectedStatus(null);
    setCurrentPage(1);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/admin/products/${id}`);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleFilterApply = () => {
    setCurrentPage(1);
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedProducts);
    
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    
    setSelectedProducts(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedData.map(product => product.id);
      setSelectedProducts(new Set(allIds));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const areAllSelected = paginatedData.length > 0 && 
    paginatedData.every(product => selectedProducts.has(product.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des produits</h2>
          <p className="text-muted-foreground">
            Gérez les produits de votre catalogue
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Produits</CardTitle>
            <CardDescription>
              {filteredData.length} produit{filteredData.length > 1 ? 's' : ''} trouvé{filteredData.length > 1 ? 's' : ''}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ProductFilters
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            onSearchChange={setSearchTerm}
            onCategoryChange={setSelectedCategory}
            onStatusChange={setSelectedStatus}
            onReset={handleResetFilters}
            onApply={handleFilterApply}
          />
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={areAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Prix
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0 ml-1"
                        onClick={() => {
                          if (sortColumn === 'price') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn('price');
                            setSortDirection('asc');
                          }
                        }}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>En avant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((product) => (
                    <ProductRow 
                      key={product.id}
                      product={product}
                      onViewDetails={handleViewDetails}
                      isSelected={selectedProducts.has(product.id)}
                      onSelectChange={handleSelectProduct}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Aucun produit trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredData.length > 0 && (
            <ProductPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredData.length}
              pageSize={itemsPerPage}
              onPageChange={handlePageChange}
              selectedCount={selectedProducts.size}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminProductsPage; 