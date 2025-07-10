"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Package, 
  MapPin, 
  Calendar,
  Clock,
  Euro,
  Weight,
  Ruler,
  AlertTriangle,
  Shield,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';

const ANNOUNCEMENT_TYPES = {
  PACKAGE_DELIVERY: {
    title: 'Livraison de Colis',
    description: 'Transport de colis d\'un point A à un point B',
    icon: Package,
    color: 'bg-blue-50 border-blue-200'
  },
  PERSON_TRANSPORT: {
    title: 'Transport de Personne',
    description: 'Transport de personnes (clients, proches)',
    icon: Package,
    color: 'bg-purple-50 border-purple-200'
  },
  AIRPORT_TRANSFER: {
    title: 'Transfert Aéroport',
    description: 'Navette départ ou arrivée aéroport',
    icon: Package,
    color: 'bg-orange-50 border-orange-200'
  },
  SHOPPING: {
    title: 'Service de Courses',
    description: 'Courses effectuées par le livreur',
    icon: Package,
    color: 'bg-yellow-50 border-yellow-200'
  },
  INTERNATIONAL_PURCHASE: {
    title: 'Achat International',
    description: 'Rapporter des produits depuis l\'étranger',
    icon: Package,
    color: 'bg-indigo-50 border-indigo-200'
  },
  CART_DROP: {
    title: 'Lâcher de Chariot',
    description: 'Livraison à domicile depuis votre magasin',
    icon: Package,
    color: 'bg-green-50 border-green-200'
  }
};

export default function CreateSingleAnnouncementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as keyof typeof ANNOUNCEMENT_TYPES || 'PACKAGE_DELIVERY';
  const t = useTranslations('merchant.announcements.create');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: type,
    basePrice: '',
    pickupAddress: '',
    deliveryAddress: '',
    weight: '',
    dimensions: '',
    isFragile: false,
    requiresInsurance: false,
    maxInsuranceValue: '',
    pickupDate: '',
    isUrgent: false,
    specialInstructions: ''
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim() || formData.title.length < 5) {
      setError('Le titre doit faire au moins 5 caractères');
      return false;
    }
    
    if (formData.title.length > 200) {
      setError('Le titre ne peut pas dépasser 200 caractères');
      return false;
    }
    
    if (!formData.description.trim() || formData.description.length < 20) {
      setError('La description doit faire au moins 20 caractères');
      return false;
    }
    
    if (formData.description.length > 2000) {
      setError('La description ne peut pas dépasser 2000 caractères');
      return false;
    }
    
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      setError('Le prix doit être supérieur à 0');
      return false;
    }
    
    if (!formData.pickupAddress.trim() || formData.pickupAddress.length < 10) {
      setError('L\'adresse de récupération doit faire au moins 10 caractères');
      return false;
    }
    
    if (formData.pickupAddress.length > 500) {
      setError('L\'adresse de récupération ne peut pas dépasser 500 caractères');
      return false;
    }
    
    if (!formData.deliveryAddress.trim() || formData.deliveryAddress.length < 10) {
      setError('L\'adresse de livraison doit faire au moins 10 caractères');
      return false;
    }
    
    if (formData.deliveryAddress.length > 500) {
      setError('L\'adresse de livraison ne peut pas dépasser 500 caractères');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const requestData = {
        ...formData,
        basePrice: parseFloat(formData.basePrice),
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        maxInsuranceValue: formData.maxInsuranceValue ? parseFloat(formData.maxInsuranceValue) : undefined,
        pickupDate: formData.pickupDate ? new Date(formData.pickupDate).toISOString() : undefined
      };

      const response = await fetch('/api/merchant/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création');
      }

      const result = await response.json();
      
      setSuccess(true);
      
      // Rediriger vers la liste après 2 secondes
      setTimeout(() => {
        router.push('/merchant/announcements');
      }, 2000);

    } catch (error) {
      console.error('Erreur création annonce:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const currentType = ANNOUNCEMENT_TYPES[type];

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Annonce créée avec succès !</h2>
            <p className="text-muted-foreground mb-4">
              Votre annonce est maintenant active et visible par les livreurs.
            </p>
            <Button asChild>
              <Link href="/merchant/announcements">
                Voir mes annonces
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/merchant/announcements/create">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Créer une Annonce</h1>
          <div className="flex items-center gap-2 mt-1">
            <currentType.icon className="h-5 w-5" />
            <span className="text-muted-foreground">{currentType.title}</span>
            <Badge variant="outline">{currentType.description}</Badge>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Informations générales
                </CardTitle>
                <CardDescription>
                  Décrivez clairement votre demande pour attirer les bons livreurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre de l'annonce *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Ex: Livraison urgente documents Paris → Lyon"
                    className="w-full"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.title.length}/200 caractères - Minimum 5, soyez précis et accrocheur
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description détaillée *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Décrivez en détail ce qui doit être livré, les contraintes, les délais..."
                    rows={4}
                    className="w-full"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/2000 caractères - Minimum 20, plus c'est détaillé, mieux c'est
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basePrice">Prix proposé (€) *</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.basePrice}
                      onChange={(e) => handleInputChange('basePrice', e.target.value)}
                      placeholder="25.50"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Prix attractif = plus de candidats. Commission EcoDeli : 15%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Adresses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adresses
                </CardTitle>
                <CardDescription>
                  Indiquez les points de récupération et de livraison
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupAddress">Adresse de récupération *</Label>
                  <Input
                    id="pickupAddress"
                    value={formData.pickupAddress}
                    onChange={(e) => handleInputChange('pickupAddress', e.target.value)}
                    placeholder="Ex: 123 rue de la Paix, 75001 Paris"
                    className="w-full"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.pickupAddress.length}/500 caractères
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Adresse de livraison *</Label>
                  <Input
                    id="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                    placeholder="Ex: 456 avenue des Champs, 69001 Lyon"
                    className="w-full"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.deliveryAddress.length}/500 caractères
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Caractéristiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Caractéristiques
                </CardTitle>
                <CardDescription>
                  Détails sur le colis ou le service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Poids (kg)</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="2.5"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dimensions">Dimensions (cm)</Label>
                    <Input
                      id="dimensions"
                      value={formData.dimensions}
                      onChange={(e) => handleInputChange('dimensions', e.target.value)}
                      placeholder="30x20x10"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFragile"
                      checked={formData.isFragile}
                      onCheckedChange={(checked) => handleInputChange('isFragile', !!checked)}
                    />
                    <Label htmlFor="isFragile" className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Colis fragile - manipulation délicate requise
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requiresInsurance"
                      checked={formData.requiresInsurance}
                      onCheckedChange={(checked) => handleInputChange('requiresInsurance', !!checked)}
                    />
                    <Label htmlFor="requiresInsurance" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Assurance obligatoire
                    </Label>
                  </div>

                  {formData.requiresInsurance && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="maxInsuranceValue">Valeur à assurer (€)</Label>
                      <Input
                        id="maxInsuranceValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.maxInsuranceValue}
                        onChange={(e) => handleInputChange('maxInsuranceValue', e.target.value)}
                        placeholder="150.00"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isUrgent"
                      checked={formData.isUrgent}
                      onCheckedChange={(checked) => handleInputChange('isUrgent', !!checked)}
                    />
                    <Label htmlFor="isUrgent" className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      Livraison urgente (dans les 24h)
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Planification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Planification
                </CardTitle>
                <CardDescription>
                  Quand souhaitez-vous que ce soit fait ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupDate">Date/heure souhaitée</Label>
                  <Input
                    id="pickupDate"
                    type="datetime-local"
                    value={formData.pickupDate}
                    onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Laissez vide pour "Dès que possible"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Instructions spéciales */}
            <Card>
              <CardHeader>
                <CardTitle>Instructions spéciales</CardTitle>
                <CardDescription>
                  Informations complémentaires pour le livreur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  placeholder="Ex: Sonner à l'interphone, étage 3, porte droite..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Résumé des frais */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Résumé des frais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Prix de base :</span>
                  <span className="font-medium">{formData.basePrice || '0'} €</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Commission EcoDeli (15%) :</span>
                  <span>-{(parseFloat(formData.basePrice || '0') * 0.15).toFixed(2)} €</span>
                </div>
                {formData.isUrgent && (
                  <div className="flex justify-between text-orange-600">
                    <span>Supplément urgent (20%) :</span>
                    <span>+{(parseFloat(formData.basePrice || '0') * 0.20).toFixed(2)} €</span>
                  </div>
                )}
                <hr className="border-blue-300" />
                <div className="flex justify-between font-medium text-blue-900">
                  <span>Vous recevrez :</span>
                  <span>
                    {(
                      parseFloat(formData.basePrice || '0') * 0.85 + 
                      (formData.isUrgent ? parseFloat(formData.basePrice || '0') * 0.20 : 0)
                    ).toFixed(2)} €
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Erreurs */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" asChild>
            <Link href="/merchant/announcements/create">
              Annuler
            </Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer l\'annonce'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 