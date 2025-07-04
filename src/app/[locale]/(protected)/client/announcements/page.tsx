"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Plus, Package, MapPin, Calendar, DollarSign, Eye, Edit, 
  Trash2, Users, Search, Filter, AlertTriangle
} from "lucide-react";

type AnnouncementStatus = 'DRAFT' | 'ACTIVE' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type AnnouncementType = 'PACKAGE_DELIVERY' | 'SHOPPING' | 'INTERNATIONAL_PURCHASE' | 'CART_DROP';

interface AnnouncementListItem {
  id: string;
  title: string;
  description: string;
  type: AnnouncementType;
  deliveryType: string;
  status: AnnouncementStatus;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: string;
  basePrice: number;
  currency: string;
  isUrgent: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Statistiques
  matchesCount: number;
  viewsCount: number;
  
  // Détails pour certains statuts
  delivery?: {
    id: string;
    status: string;
    delivererName: string;
    validationCode?: string;
  };
}

interface APIResponse {
  announcements: AnnouncementListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    totalValue: number;
    averagePrice: number;
    byStatus: Array<{ status: string; _count: number }>;
    byType: Array<{ type: string; _count: number }>;
  };
}

const statusLabels = {
  'DRAFT': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', description: 'Modifier ou supprimer' },
  'ACTIVE': { label: 'Publiée', color: 'bg-green-100 text-green-800', description: 'Visible aux livreurs' },
  'MATCHED': { label: 'Matchée', color: 'bg-blue-100 text-blue-800', description: 'Livreur trouvé' },
  'IN_PROGRESS': { label: 'En cours', color: 'bg-orange-100 text-orange-800', description: 'Livraison en cours' },
  'COMPLETED': { label: 'Terminée', color: 'bg-green-100 text-green-800', description: 'Livraison terminée' },
  'CANCELLED': { label: 'Annulée', color: 'bg-red-100 text-red-800', description: 'Annulée par le client' }
};

const typeLabels = {
  'PACKAGE_DELIVERY': { label: 'Livraison de colis', icon: Package },
  'SHOPPING': { label: 'Courses', icon: Package },
  'INTERNATIONAL_PURCHASE': { label: 'Achat international', icon: Package },
  'CART_DROP': { label: 'Lâcher de chariot', icon: Package }
};

// Fonction utilitaire pour obtenir les informations de statut de manière sécurisée
const getStatusInfo = (status: any) => {
  const statusString = String(status || 'UNKNOWN');
  return statusLabels[statusString as keyof typeof statusLabels] || {
    label: statusString,
    color: 'bg-gray-100 text-gray-800',
    description: 'Statut inconnu'
  };
};

// Fonction utilitaire pour obtenir les informations de type de manière sécurisée
const getTypeInfo = (type: any) => {
  const typeString = String(type || 'PACKAGE_DELIVERY');
  return typeLabels[typeString as keyof typeof typeLabels] || {
    label: typeString,
    icon: Package
  };
};

export default function ClientAnnouncementsPage() {
  const { user } = useAuth();
  const t = useTranslations("client.announcements");
  
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<APIResponse['pagination'] | null>(null);
  const [stats, setStats] = useState<APIResponse['stats'] | null>(null);
  
  // Filtres
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        sortBy,
        sortOrder
      });
      
      if (currentTab !== 'all') {
        params.append('status', currentTab);
      }
      
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      console.log('🔍 Récupération annonces avec filtres:', Object.fromEntries(params));

      const response = await fetch(`/api/client/announcements?${params}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data: APIResponse = await response.json();
      
      setAnnouncements(data.announcements || []);
      setPagination(data.pagination);
      setStats(data.stats);
      
      console.log('✅ Annonces chargées:', data.announcements.length);
      
    } catch (error) {
      console.error('❌ Erreur chargement annonces:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user, currentTab, typeFilter, sortBy, sortOrder, currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAnnouncements();
  };

  const handleDelete = async (announcementId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/client/announcements/${announcementId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Recharger la liste
        fetchAnnouncements();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || 'Impossible de supprimer'}`);
      }
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      alert('Erreur de connexion');
    }
  };

  const formatPrice = (price: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionsForStatus = (announcement: AnnouncementListItem) => {
    const actions = [];
    
    // Toujours voir les détails
    actions.push(
      <Link key="view" href={`/client/announcements/${announcement.id}`}>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          Voir
        </Button>
      </Link>
    );

    switch (announcement.status) {
      case 'DRAFT':
        // Modifier ou supprimer
        actions.push(
          <Link key="edit" href={`/client/announcements/${announcement.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Modifier
            </Button>
          </Link>
        );
        actions.push(
          <Button
            key="delete"
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(announcement.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </Button>
        );
        break;
        
      case 'ACTIVE':
        // Voir candidats ou supprimer
        if (announcement.matchesCount > 0) {
          actions.push(
            <Link key="candidates" href={`/client/announcements/${announcement.id}/candidates`}>
              <Button size="sm">
                <Users className="h-4 w-4 mr-1" />
                Candidats ({announcement.matchesCount})
              </Button>
            </Link>
          );
        }
        actions.push(
          <Button
            key="delete"
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(announcement.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </Button>
        );
        break;
        
      case 'MATCHED':
      case 'IN_PROGRESS':
        // Suivre la livraison
        actions.push(
          <Link key="track" href={`/client/deliveries/${announcement.delivery?.id}`}>
            <Button size="sm">
              <MapPin className="h-4 w-4 mr-1" />
              Suivre livraison
            </Button>
          </Link>
        );
        break;
        
      case 'COMPLETED':
        // Voir le détail ou évaluer
        if (announcement.delivery) {
          actions.push(
            <Link key="review" href={`/client/deliveries/${announcement.delivery.id}/review`}>
              <Button variant="outline" size="sm">
                ⭐ Évaluer
              </Button>
            </Link>
          );
        }
        break;
        
      case 'CANCELLED':
        // Pas d'actions spéciales
        break;
    }

    return actions;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Connexion requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour voir vos annonces.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes annonces"
        description="Gérez vos demandes de transport d'objets"
        action={
          <Link href="/client/announcements/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle annonce
            </Button>
          </Link>
        }
      />

      {/* Statistiques rapides */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {announcements.length}
              </div>
              <p className="text-sm text-gray-600">Annonces totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(stats.totalValue)}
              </div>
              <p className="text-sm text-gray-600">Valeur totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {formatPrice(stats.averagePrice)}
              </div>
              <p className="text-sm text-gray-600">Prix moyen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {Number(stats.byStatus?.find(s => s.status === 'ACTIVE')?._count) || 0}
              </div>
              <p className="text-sm text-gray-600">Actives</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher une annonce..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Type d'annonce" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="PACKAGE_DELIVERY">Livraison de colis</SelectItem>
                  <SelectItem value="SHOPPING">Courses</SelectItem>
                  <SelectItem value="INTERNATIONAL_PURCHASE">Achat international</SelectItem>
                  <SelectItem value="CART_DROP">Lâcher de chariot</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date de création</SelectItem>
                  <SelectItem value="pickupDate">Date de récupération</SelectItem>
                  <SelectItem value="basePrice">Prix</SelectItem>
                  <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets par statut */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="DRAFT">Brouillons</TabsTrigger>
          <TabsTrigger value="ACTIVE">Publiées</TabsTrigger>
          <TabsTrigger value="MATCHED">Matchées</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">En cours</TabsTrigger>
          <TabsTrigger value="COMPLETED">Terminées</TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des annonces...</p>
              </div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune annonce trouvée
              </h3>
              <p className="text-gray-600 mb-6">
                {currentTab === 'all' 
                  ? "Vous n'avez pas encore créé d'annonce." 
                  : `Aucune annonce avec le statut "${getStatusInfo(currentTab).label}".`
                }
              </p>
              {currentTab === 'all' && (
                <Link href="/client/announcements/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer ma première annonce
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((announcement) => {
                const statusInfo = getStatusInfo(announcement.status);
                const typeInfo = getTypeInfo(announcement.type);
                const TypeIcon = typeInfo.icon;
                
                return (
                  <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                                              <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-5 w-5 text-blue-600" />
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {announcement.isUrgent && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Urgent
                            </Badge>
                          )}
                        </div>
                      
                      <CardTitle className="text-lg line-clamp-2">
                        {announcement.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {announcement.description}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 truncate">
                            {announcement.pickupAddress}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {formatDate(announcement.pickupDate)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold text-green-600">
                              {formatPrice(announcement.basePrice, announcement.currency)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {announcement.matchesCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {announcement.matchesCount}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {announcement.viewsCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Code de validation pour livraisons en cours */}
                      {announcement.delivery?.validationCode && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-yellow-800 mb-1">
                            Code de validation:
                          </p>
                          <code className="text-lg font-mono bg-white px-2 py-1 rounded">
                            {announcement.delivery.validationCode}
                          </code>
                        </div>
                      )}
                      
                                              <div className="flex flex-wrap gap-2 pt-2">
                          {getActionsForStatus(announcement)}
                        </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={!pagination.hasPrev}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Précédent
              </Button>
              
              <span className="px-4 py-2 text-sm">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                disabled={!pagination.hasNext}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}