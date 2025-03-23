"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  MoreHorizontal,
  PlusCircle,
  UserCheck,
  Calendar,
  Star,
  ArrowDown,
  ArrowUp,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  Clock,
  MapPin,
  Briefcase
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

// Types
type ProviderStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
type ServiceType = 'TRANSPORT' | 'DELIVERY' | 'SHOPPING' | 'AIRPORT' | 'HOUSEKEEPING' | 'GARDENING' | 'PETCARE';

interface ProviderService {
  type: ServiceType;
  description: string;
  hourlyRate: number;
  isVerified: boolean;
}

interface ProviderType {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  joinedDate: Date;
  status: ProviderStatus;
  rating: number;
  reviews: number;
  completedJobs: number;
  services: ProviderService[];
  monthlyEarnings: number;
  availableTimeSlots: string[];
  avatar?: string;
}

// Status configuration for colors
const PROVIDER_STATUS_COLORS: Record<ProviderStatus, string> = {
  'ACTIVE': 'bg-green-100 text-green-800 hover:bg-green-100',
  'PENDING': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  'REJECTED': 'bg-red-100 text-red-800 hover:bg-red-100',
  'SUSPENDED': 'bg-gray-100 text-gray-800 hover:bg-gray-100',
};

// Service type colors
const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
  'TRANSPORT': 'bg-blue-100 text-blue-800',
  'DELIVERY': 'bg-indigo-100 text-indigo-800',
  'SHOPPING': 'bg-purple-100 text-purple-800',
  'AIRPORT': 'bg-cyan-100 text-cyan-800',
  'HOUSEKEEPING': 'bg-orange-100 text-orange-800',
  'GARDENING': 'bg-green-100 text-green-800',
  'PETCARE': 'bg-rose-100 text-rose-800',
};

// Translations for status and service types
const PROVIDER_STATUS_TRANSLATIONS: Record<ProviderStatus, string> = {
  'ACTIVE': 'Actif',
  'PENDING': 'En attente',
  'REJECTED': 'Rejeté',
  'SUSPENDED': 'Suspendu',
};

const SERVICE_TYPE_TRANSLATIONS: Record<ServiceType, string> = {
  'TRANSPORT': 'Transport de personnes',
  'DELIVERY': 'Livraison',
  'SHOPPING': 'Courses',
  'AIRPORT': 'Transfert aéroport',
  'HOUSEKEEPING': 'Tâches ménagères',
  'GARDENING': 'Jardinage',
  'PETCARE': 'Garde d\'animaux',
};

// Service icons mapping
const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  'TRANSPORT': <UserCheck className="h-4 w-4" />,
  'DELIVERY': <Briefcase className="h-4 w-4" />,
  'SHOPPING': <Briefcase className="h-4 w-4" />,
  'AIRPORT': <Briefcase className="h-4 w-4" />,
  'HOUSEKEEPING': <Briefcase className="h-4 w-4" />,
  'GARDENING': <Briefcase className="h-4 w-4" />,
  'PETCARE': <Briefcase className="h-4 w-4" />,
};

// Generate mock providers data
const generateMockProviders = (count: number): ProviderType[] => {
  const cities = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Toulouse', 'Nantes', 'Strasbourg'];
  const serviceTypes: ServiceType[] = ['TRANSPORT', 'DELIVERY', 'SHOPPING', 'AIRPORT', 'HOUSEKEEPING', 'GARDENING', 'PETCARE'];
  const statuses: ProviderStatus[] = ['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED'];
  
  const timeSlots = [
    "Lundi matin", "Lundi après-midi", "Lundi soir",
    "Mardi matin", "Mardi après-midi", "Mardi soir",
    "Mercredi matin", "Mercredi après-midi", "Mercredi soir",
    "Jeudi matin", "Jeudi après-midi", "Jeudi soir",
    "Vendredi matin", "Vendredi après-midi", "Vendredi soir",
    "Samedi matin", "Samedi après-midi", "Samedi soir",
    "Dimanche matin", "Dimanche après-midi", "Dimanche soir"
  ];
  
  return Array.from({ length: count }).map((_, i) => {
    // Generate random dates within the last 2 years
    const today = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(today.getFullYear() - 2);
    
    const randomJoinDate = new Date(
      twoYearsAgo.getTime() + Math.random() * (today.getTime() - twoYearsAgo.getTime())
    );
    
    // More likely to be active if recently joined
    const daysSinceJoined = (today.getTime() - randomJoinDate.getTime()) / (1000 * 60 * 60 * 24);
    
    let status: ProviderStatus;
    if (daysSinceJoined < 30) {
      // Newer providers are more likely to be pending
      status = Math.random() > 0.3 ? 'PENDING' : 'ACTIVE';
    } else if (daysSinceJoined > 365) {
      // Older providers have more varied statuses
      status = Math.random() > 0.2 ? 'ACTIVE' : statuses[Math.floor(Math.random() * statuses.length)];
    } else {
      // Middle-aged accounts are mostly active
      status = Math.random() > 0.1 ? 'ACTIVE' : statuses[Math.floor(Math.random() * statuses.length)];
    }
    
    // Generate random set of services (1-4 services)
    const numServices = Math.floor(Math.random() * 3) + 1;
    const selectedServiceTypes = [...serviceTypes]
      .sort(() => 0.5 - Math.random())
      .slice(0, numServices);
    
    const services: ProviderService[] = selectedServiceTypes.map(type => ({
      type,
      description: `Service de ${SERVICE_TYPE_TRANSLATIONS[type].toLowerCase()}`,
      hourlyRate: Math.floor(Math.random() * 20) + 10, // 10-30 euros/hour
      isVerified: Math.random() > 0.2 // 80% chance of being verified
    }));
    
    // Generate a random rating (3.0-5.0)
    const rating = Math.round((3 + Math.random() * 2) * 10) / 10;
    
    // Generate random number of reviews and completed jobs
    const reviews = Math.floor(Math.random() * 50) + 1;
    const completedJobs = reviews + Math.floor(Math.random() * 20);
    
    // Generate random earnings based on completed jobs and hourly rates
    const avgHourlyRate = services.reduce((sum, s) => sum + s.hourlyRate, 0) / services.length;
    const monthlyEarnings = Math.round(avgHourlyRate * (Math.random() * 40 + 10)); // 10-50 hours per month
    
    // Generate random availability (5-15 time slots)
    const numTimeSlots = Math.floor(Math.random() * 10) + 5;
    const availableTimeSlots = [...timeSlots]
      .sort(() => 0.5 - Math.random())
      .slice(0, numTimeSlots);
    
    const name = `Prestataire ${i + 1}`;
    
    return {
      id: `p-${i + 100}`,
      name,
      email: `contact@prestataire${i + 1}.fr`,
      phone: `0${Math.floor(Math.random() * 900000000) + 100000000}`,
      address: `${Math.floor(Math.random() * 100) + 1} Rue de ${["Paris", "Lyon", "Bordeaux"][Math.floor(Math.random() * 3)]}`,
      city: cities[Math.floor(Math.random() * cities.length)],
      postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
      joinedDate: randomJoinDate,
      status,
      rating,
      reviews,
      completedJobs,
      services,
      monthlyEarnings,
      availableTimeSlots,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    };
  });
};

// Generate mock data
const mockProviders = generateMockProviders(18);

// ProviderCard component for displaying provider summary
function ProviderCard(props: { provider: ProviderType; onView: (id: string) => void }) {
  const { provider, onView } = props;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={provider.avatar} />
              <AvatarFallback>{provider.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base mb-1">{provider.name}</CardTitle>
              <Badge className={PROVIDER_STATUS_COLORS[provider.status]}>
                {PROVIDER_STATUS_TRANSLATIONS[provider.status]}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onView(provider.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="font-medium">{provider.rating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm ml-1">
                ({provider.reviews} avis)
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {provider.completedJobs} services
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2 mb-3">
            {provider.services.map((service) => (
              <Badge 
                key={service.type} 
                className={`${SERVICE_TYPE_COLORS[service.type]} flex items-center gap-1`}
              >
                {SERVICE_ICONS[service.type]}
                <span className="truncate max-w-[120px]">{SERVICE_TYPE_TRANSLATIONS[service.type]}</span>
                {service.isVerified && <CheckCircle className="h-3 w-3 ml-1" />}
              </Badge>
            ))}
          </div>
          
          <div className="flex justify-between text-sm mt-3">
            <div>
              <p className="text-muted-foreground">Tarif horaire moyen</p>
              <p className="font-medium">
                {Math.round(
                  provider.services.reduce((sum, s) => sum + s.hourlyRate, 0) / 
                  provider.services.length
                )}€ / heure
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Revenus mensuels</p>
              <p className="font-medium">{provider.monthlyEarnings}€</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{provider.city}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Depuis {format(provider.joinedDate, 'MMM yyyy', { locale: fr })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ProviderFilters component
function ProviderFilters(props: {
  onSearch: (value: string) => void;
  onFilterStatus: (status: ProviderStatus | 'ALL') => void;
  onFilterService: (type: ServiceType | 'ALL') => void;
  onFilterCity: (city: string | 'ALL') => void;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  cities: string[];
}) {
  const { onSearch, onFilterStatus, onFilterService, onFilterCity, onSortChange, cities } = props;
  const [sortField, setSortField] = useState('rating');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const handleSortChange = (field: string) => {
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
    onSortChange(field, newDirection);
  };
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un prestataire..."
            className="pl-8 w-full"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-row gap-2">
          <Select defaultValue="ALL" onValueChange={(value) => onFilterStatus(value as ProviderStatus | 'ALL')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value="ACTIVE">Actifs</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="REJECTED">Rejetés</SelectItem>
              <SelectItem value="SUSPENDED">Suspendus</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="ALL" onValueChange={(value) => onFilterService(value as ServiceType | 'ALL')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type de service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les services</SelectItem>
              <SelectItem value="TRANSPORT">Transport</SelectItem>
              <SelectItem value="DELIVERY">Livraison</SelectItem>
              <SelectItem value="SHOPPING">Courses</SelectItem>
              <SelectItem value="AIRPORT">Transfert aéroport</SelectItem>
              <SelectItem value="HOUSEKEEPING">Tâches ménagères</SelectItem>
              <SelectItem value="GARDENING">Jardinage</SelectItem>
              <SelectItem value="PETCARE">Garde d'animaux</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="ALL" onValueChange={(value) => onFilterCity(value)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les villes</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSortChange('rating')} className="h-8">
            <span>Note</span>
            {sortField === 'rating' && (
              sortDirection === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSortChange('completedJobs')} className="h-8">
            <span>Services</span>
            {sortField === 'completedJobs' && (
              sortDirection === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSortChange('monthlyEarnings')} className="h-8">
            <span>Revenus</span>
            {sortField === 'monthlyEarnings' && (
              sortDirection === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Ajouter un prestataire</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau prestataire</DialogTitle>
              <DialogDescription>
                Remplissez les informations ci-dessous pour ajouter un nouveau prestataire de services à la plateforme.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="personal">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="personal">Informations personnelles</TabsTrigger>
                <TabsTrigger value="services">Services proposés</TabsTrigger>
                <TabsTrigger value="availability">Disponibilités</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Nom complet</label>
                    <Input placeholder="Nom du prestataire" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Email</label>
                    <Input placeholder="Email de contact" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Téléphone</label>
                    <Input placeholder="Numéro de téléphone" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Statut</label>
                    <Select defaultValue="PENDING">
                      <SelectTrigger>
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Actif</SelectItem>
                        <SelectItem value="PENDING">En attente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm">Adresse</label>
                    <Input placeholder="Adresse complète" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Ville</label>
                    <Input placeholder="Ville" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Code postal</label>
                    <Input placeholder="Code postal" />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="services" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Type de service</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRANSPORT">Transport de personnes</SelectItem>
                        <SelectItem value="DELIVERY">Livraison</SelectItem>
                        <SelectItem value="SHOPPING">Courses</SelectItem>
                        <SelectItem value="AIRPORT">Transfert aéroport</SelectItem>
                        <SelectItem value="HOUSEKEEPING">Tâches ménagères</SelectItem>
                        <SelectItem value="GARDENING">Jardinage</SelectItem>
                        <SelectItem value="PETCARE">Garde d'animaux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm">Tarif horaire (€)</label>
                    <Input type="number" placeholder="Tarif horaire" />
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm">Description</label>
                    <Input placeholder="Description du service" />
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ajouter un autre service
                </Button>
              </TabsContent>
              
              <TabsContent value="availability" className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => (
                    <div key={day} className="space-y-2">
                      <h3 className="font-medium text-sm">{day}</h3>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`${day.toLowerCase()}-morning`} />
                          <label htmlFor={`${day.toLowerCase()}-morning`} className="text-sm">
                            Matin
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`${day.toLowerCase()}-afternoon`} />
                          <label htmlFor={`${day.toLowerCase()}-afternoon`} className="text-sm">
                            Après-midi
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`${day.toLowerCase()}-evening`} />
                          <label htmlFor={`${day.toLowerCase()}-evening`} className="text-sm">
                            Soir
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4">
              <Button variant="outline">Annuler</Button>
              <Button>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Main page component
export function AdminProvidersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProviderStatus | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'ALL'>('ALL');
  const [cityFilter, setCityFilter] = useState<string | 'ALL'>('ALL');
  const [sortField, setSortField] = useState('rating');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Extract unique cities from providers
  const uniqueCities = Array.from(new Set(mockProviders.map(p => p.city))).sort();
  
  // Filter providers based on search and filters
  const filteredProviders = mockProviders.filter(provider => {
    const matchesSearch = searchTerm === '' || 
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || provider.status === statusFilter;
    const matchesCity = cityFilter === 'ALL' || provider.city === cityFilter;
    
    // For service filter, check if any of the provider's services match the selected service type
    const matchesService = serviceFilter === 'ALL' || 
      provider.services.some(service => service.type === serviceFilter);
    
    return matchesSearch && matchesStatus && matchesService && matchesCity;
  });
  
  // Sort providers
  const sortedProviders = [...filteredProviders].sort((a, b) => {
    const factor = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'rating':
        return (a.rating - b.rating) * factor;
      case 'completedJobs':
        return (a.completedJobs - b.completedJobs) * factor;
      case 'monthlyEarnings':
        return (a.monthlyEarnings - b.monthlyEarnings) * factor;
      case 'joinedDate':
        return (a.joinedDate.getTime() - b.joinedDate.getTime()) * factor;
      default:
        return 0;
    }
  });
  
  const handleViewProvider = (id: string) => {
    router.push(`/admin/providers/${id}`);
  };
  
  const handleEditProvider = (id: string) => {
    router.push(`/admin/providers/${id}/edit`);
  };
  
  const handleDeleteProvider = (id: string) => {
    // In a real app, this would make an API call
    console.log(`Deleting provider with id: ${id}`);
    // Then remove from the UI or show a success message
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prestataires</h2>
          <p className="text-muted-foreground">
            Gérez les prestataires de services, leurs qualifications et leurs paiements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'table' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Tableau
          </Button>
          <Button 
            variant={viewMode === 'cards' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            Cartes
          </Button>
        </div>
      </div>
      
      <ProviderFilters
        onSearch={setSearchTerm}
        onFilterStatus={setStatusFilter}
        onFilterService={setServiceFilter}
        onFilterCity={setCityFilter}
        onSortChange={(field, direction) => {
          setSortField(field);
          setSortDirection(direction);
        }}
        cities={uniqueCities}
      />
      
      {filteredProviders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg border border-dashed">
          <UserCheck className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun prestataire trouvé</h3>
          <p className="text-muted-foreground text-center mb-4">
            Aucun prestataire ne correspond à vos critères de recherche ou de filtrage.
          </p>
          <Button onClick={() => {
            setSearchTerm('');
            setStatusFilter('ALL');
            setServiceFilter('ALL');
            setCityFilter('ALL');
          }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prestataire</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Services complétés</TableHead>
                <TableHead>Revenus mensuels</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProviders.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={provider.avatar} />
                        <AvatarFallback>{provider.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-sm text-muted-foreground">{provider.city}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {provider.services.map((service) => (
                        <Badge 
                          key={service.type} 
                          className={`${SERVICE_TYPE_COLORS[service.type]} flex items-center gap-1`}
                        >
                          {SERVICE_ICONS[service.type]}
                          <span className="truncate max-w-[80px]">
                            {SERVICE_TYPE_TRANSLATIONS[service.type]}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span>{provider.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        ({provider.reviews})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{provider.completedJobs}</TableCell>
                  <TableCell>{provider.monthlyEarnings}€</TableCell>
                  <TableCell>
                    <Badge className={PROVIDER_STATUS_COLORS[provider.status]}>
                      {PROVIDER_STATUS_TRANSLATIONS[provider.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(provider.joinedDate, 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewProvider(provider.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>Voir le détail</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProvider(provider.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Modifier</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600" 
                          onClick={() => handleDeleteProvider(provider.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Supprimer</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProviders.map((provider) => (
            <ProviderCard 
              key={provider.id} 
              provider={provider} 
              onView={handleViewProvider} 
            />
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Affichage de {filteredProviders.length} prestataires sur {mockProviders.length} au total
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Précédent
          </Button>
          <Button variant="outline" size="sm" disabled>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminProvidersPage;
