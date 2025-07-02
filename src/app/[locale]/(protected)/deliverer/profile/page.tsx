"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Truck,
  Shield,
  FileText,
  Settings,
  Edit,
  Upload,
  Download,
  Star,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Route,
  Calendar,
  Euro,
  Award,
  Car,
  Bike
} from "lucide-react";

interface Document {
  id: string;
  type: string;
  filename: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  url?: string;
}

interface Route {
  id: string;
  name: string;
  fromAddress: string;
  toAddress: string;
  schedule: any;
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface DelivererProfile {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
    phone?: string;
    image?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    dateOfBirth?: string;
  };
  deliverer: {
    validationStatus: string;
    vehicleType?: string;
    licensePlate?: string;
    maxWeight?: number;
    maxVolume?: number;
    averageRating: number;
    totalDeliveries: number;
    isActive: boolean;
    nfcCardId?: string;
    activatedAt?: string;
    lastActiveAt?: string;
  };
  documents: Document[];
  stats: {
    totalDeliveries: number;
    completedDeliveries: number;
    totalEarnings: number;
    averageRating: number;
    activeRoutes: number;
    pendingDocuments: number;
    approvedDocuments: number;
    totalReviews: number;
  };
  routes: Route[];
  availabilities: Availability[];
}

const vehicleTypeLabels = {
  VOITURE: { name: 'Voiture', icon: Car },
  MOTO: { name: 'Moto', icon: Car }, // Using Car icon as fallback
  VELO: { name: 'Vélo', icon: Bike },
  CAMION: { name: 'Camion', icon: Truck }
};

const validationStatusLabels = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: XCircle }
};

const documentTypeLabels = {
  IDENTITY: 'Pièce d\'identité',
  DRIVING_LICENSE: 'Permis de conduire',
  INSURANCE: 'Assurance'
};

const dayLabels = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi'
};

export default function DelivererProfilePage() {
  const { user } = useAuth();
  const t = useTranslations("deliverer.profile");
  const [profile, setProfile] = useState<DelivererProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Formulaires
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    dateOfBirth: '',
    vehicleType: '',
    licensePlate: '',
    maxWeight: '',
    maxVolume: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/deliverer/profile');
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        
        // Pré-remplir le formulaire
        setProfileForm({
          name: data.profile.user.name || '',
          email: data.profile.user.email || '',
          phone: data.profile.user.phone || '',
          address: data.profile.user.address || '',
          city: data.profile.user.city || '',
          postalCode: data.profile.user.postalCode || '',
          country: data.profile.user.country || '',
          dateOfBirth: data.profile.user.dateOfBirth ? data.profile.user.dateOfBirth.split('T')[0] : '',
          vehicleType: data.profile.deliverer.vehicleType || '',
          licensePlate: data.profile.deliverer.licensePlate || '',
          maxWeight: data.profile.deliverer.maxWeight?.toString() || '',
          maxVolume: data.profile.deliverer.maxVolume?.toString() || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    try {
      const updates = {
        ...profileForm,
        vehicleType: profileForm.vehicleType || undefined,
        licensePlate: profileForm.licensePlate || undefined,
        maxWeight: profileForm.maxWeight ? parseFloat(profileForm.maxWeight) : undefined,
        maxVolume: profileForm.maxVolume ? parseFloat(profileForm.maxVolume) : undefined
      };

      const response = await fetch('/api/deliverer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setEditMode(false);
        await fetchProfile(); // Recharger les données
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Restaurer les valeurs originales
    if (profile) {
      setProfileForm({
        name: profile.user.name || '',
        email: profile.user.email || '',
        phone: profile.user.phone || '',
        address: profile.user.address || '',
        city: profile.user.city || '',
        postalCode: profile.user.postalCode || '',
        country: profile.user.country || '',
        dateOfBirth: profile.user.dateOfBirth ? profile.user.dateOfBirth.split('T')[0] : '',
        vehicleType: profile.deliverer.vehicleType || '',
        licensePlate: profile.deliverer.licensePlate || '',
        maxWeight: profile.deliverer.maxWeight?.toString() || '',
        maxVolume: profile.deliverer.maxVolume?.toString() || ''
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profil non trouvé</h2>
          <p className="text-muted-foreground">Impossible de charger votre profil livreur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Mon Profil Livreur"
        description="Gérez vos informations personnelles et professionnelles"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Colonne de gauche - Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              {!editMode ? (
                <Button onClick={handleEditProfile} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} size="sm">
                    Sauvegarder
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    Annuler
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date de naissance</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm({...profileForm, dateOfBirth: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                  disabled={!editMode}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={profileForm.postalCode}
                    onChange={(e) => setProfileForm({...profileForm, postalCode: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm({...profileForm, country: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations professionnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Informations professionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicleType">Type de véhicule</Label>
                  <Select
                    value={profileForm.vehicleType}
                    onValueChange={(value) => setProfileForm({...profileForm, vehicleType: value})}
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(vehicleTypeLabels).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <value.icon className="h-4 w-4" />
                            {value.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="licensePlate">Plaque d'immatriculation</Label>
                  <Input
                    id="licensePlate"
                    value={profileForm.licensePlate}
                    onChange={(e) => setProfileForm({...profileForm, licensePlate: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="maxWeight">Poids maximum (kg)</Label>
                  <Input
                    id="maxWeight"
                    type="number"
                    value={profileForm.maxWeight}
                    onChange={(e) => setProfileForm({...profileForm, maxWeight: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="maxVolume">Volume maximum (L)</Label>
                  <Input
                    id="maxVolume"
                    type="number"
                    value={profileForm.maxVolume}
                    onChange={(e) => setProfileForm({...profileForm, maxVolume: e.target.value})}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Statut de validation:</span>
                </div>
                <Badge 
                  variant={profile.deliverer.validationStatus === 'APPROVED' ? 'default' : 'secondary'}
                  className={validationStatusLabels[profile.deliverer.validationStatus as keyof typeof validationStatusLabels]?.color}
                >
                  {validationStatusLabels[profile.deliverer.validationStatus as keyof typeof validationStatusLabels]?.label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.documents.map((doc) => {
                  const statusInfo = validationStatusLabels[doc.validationStatus];
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{documentTypeLabels[doc.type as keyof typeof documentTypeLabels]}</p>
                          <p className="text-sm text-muted-foreground">{doc.filename}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {doc.url && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {profile.documents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun document uploadé</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne de droite - Statistiques et informations */}
        <div className="space-y-6">
          {/* Statistiques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{profile.stats.totalDeliveries}</p>
                  <p className="text-sm text-muted-foreground">Livraisons totales</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{profile.stats.completedDeliveries}</p>
                  <p className="text-sm text-muted-foreground">Livraisons terminées</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Euro className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">{profile.stats.totalEarnings}€</p>
                  <p className="text-sm text-muted-foreground">Gains totaux</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{profile.stats.averageRating}</p>
                  <p className="text-sm text-muted-foreground">Note moyenne</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trajets actifs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Trajets actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.routes.map((route) => (
                  <div key={route.id} className="p-3 border rounded-lg">
                    <p className="font-medium">{route.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {route.fromAddress} → {route.toAddress}
                    </p>
                  </div>
                ))}
                
                {profile.routes.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun trajet actif</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Disponibilités */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Disponibilités
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.availabilities.map((availability) => (
                  <div key={availability.id} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm font-medium">
                      {dayLabels[availability.dayOfWeek as keyof typeof dayLabels]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {availability.startTime} - {availability.endTime}
                    </span>
                  </div>
                ))}
                
                {profile.availabilities.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune disponibilité définie</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 