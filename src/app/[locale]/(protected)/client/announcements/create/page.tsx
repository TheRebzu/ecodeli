"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAnnouncementSchema, type CreateAnnouncementInput } from "@/features/announcements/schemas/announcement.schema";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import { 
  Package, MapPin, Calendar, DollarSign, Clock, 
  AlertTriangle, ArrowLeft, Save, Send, Loader2, ShoppingCart
} from "lucide-react";
import Link from "next/link";

// Utilisation du schéma importé pour la validation du formulaire
type FormData = CreateAnnouncementInput;

// Types d'annonces - TRANSPORT D'OBJETS UNIQUEMENT selon le cahier des charges EcoDeli
const announcementTypes = [
  { value: 'PACKAGE_DELIVERY', label: 'Livraison de colis', icon: Package, description: 'Transport d\'un colis d\'un point A à un point B (ex: Paris → Marseille)' },
  { value: 'SHOPPING', label: 'Courses', icon: ShoppingCart, description: 'Courses effectuées par un livreur selon une liste fournie' },
  { value: 'INTERNATIONAL_PURCHASE', label: 'Achat international', icon: Package, description: 'Achat et livraison de produits étrangers (ex: Jelly d\'Angleterre)' },
  { value: 'CART_DROP', label: 'Lâcher de chariot', icon: Package, description: 'Livraison à domicile depuis un magasin partenaire EcoDeli' }
] as const;

const deliveryTypes = [
  { value: 'FULL', label: 'Prise en charge intégrale', description: 'Point A → Point B directement' },
  { value: 'PARTIAL', label: 'Prise en charge partielle', description: 'Avec relais entrepôts EcoDeli' },
  { value: 'FINAL', label: 'Livraison finale', description: 'Depuis entrepôt → destinataire' }
] as const;

export default function CreateAnnouncementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("client.announcements");
  
  const [isLoading, setIsLoading] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<FormData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      type: 'PACKAGE_DELIVERY',
      deliveryType: 'FULL',
      currency: 'EUR',
      isUrgent: false,
      requiresInsurance: false,
      allowsPartialDelivery: false,
      isPriceNegotiable: false,
      isFlexibleDate: false,
      basePrice: 25
    }
  });

  const selectedType = watch('type');
  const selectedDeliveryType = watch('deliveryType');
  const isPackageDelivery = selectedType === 'PACKAGE_DELIVERY';
  const isShopping = selectedType === 'SHOPPING';
  const isInternationalPurchase = selectedType === 'INTERNATIONAL_PURCHASE';
  const isCartDrop = selectedType === 'CART_DROP';

  const onSubmit = async (data: FormData, isDraft = false) => {
    if (!user) return;

    setIsLoading(true);
    setSaveAsDraft(isDraft);

    try {
      console.log('📝 Envoi des données:', data);

      const response = await fetch('/api/client/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Annonce créée:', result);
        
        // Redirection vers la page de détails ou liste
        router.push(`/client/announcements/${result.announcement.id}`);
      } else {
        const error = await response.json();
        console.error('❌ Erreur API:', error);
        alert(`Erreur: ${error.error || 'Impossible de créer l\'annonce'}`);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
      setSaveAsDraft(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = announcementTypes.find(t => t.value === type);
    const IconComponent = typeConfig?.icon || Package;
    return <IconComponent className="h-4 w-4" />;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Connexion requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour créer une annonce.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Créer une annonce"
        description="Publiez votre demande de livraison ou transport d'objets"
        action={
          <Link href="/client/announcements">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux annonces
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
        {/* Type d'annonce */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Type d'annonce - Transport d'objets uniquement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {announcementTypes.map((type) => {
                    const IconComponent = type.icon;
                    const isSelected = field.value === type.value;
                    
                    return (
                      <div
                        key={type.value}
                        className={`
                          p-4 border rounded-lg cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                        onClick={() => field.onChange(type.value)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">{type.label}</span>
                        </div>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.type && (
              <p className="text-red-500 text-sm mt-2">{errors.type.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Type de prise en charge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Type de prise en charge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="deliveryType"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {deliveryTypes.map((type) => {
                    const isSelected = field.value === type.value;
                    
                    return (
                      <div
                        key={type.value}
                        className={`
                          p-4 border rounded-lg cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                        onClick={() => field.onChange(type.value)}
                      >
                        <div className="font-medium mb-1">{type.label}</div>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.deliveryType && (
              <p className="text-red-500 text-sm mt-2">{errors.deliveryType.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titre de l'annonce *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Titre descriptif de votre demande"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Décrivez précisément votre demande de transport..."
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="specialInstructions">Instructions spéciales</Label>
              <Textarea
                id="specialInstructions"
                {...register('specialInstructions')}
                placeholder="Instructions particulières, précautions..."
                rows={2}
              />
              {errors.specialInstructions && (
                <p className="text-red-500 text-sm mt-1">{errors.specialInstructions.message}</p>
              )}
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pickupAddress">Adresse de récupération *</Label>
              <Input
                id="pickupAddress"
                {...register('pickupAddress')}
                placeholder="Adresse complète (rue, ville, code postal)"
                className={errors.pickupAddress ? 'border-red-500' : ''}
              />
              {errors.pickupAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.pickupAddress.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="deliveryAddress">Adresse de livraison *</Label>
              <Input
                id="deliveryAddress"
                {...register('deliveryAddress')}
                placeholder="Adresse complète (rue, ville, code postal)"
                className={errors.deliveryAddress ? 'border-red-500' : ''}
              />
              {errors.deliveryAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.deliveryAddress.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Date et prix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pickupDate">Date de récupération *</Label>
                <Input
                  id="pickupDate"
                  type="datetime-local"
                  {...register('pickupDate')}
                  min={new Date().toISOString().slice(0, 16)}
                  className={errors.pickupDate ? 'border-red-500' : ''}
                />
                {errors.pickupDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.pickupDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryDate">Date de livraison souhaitée</Label>
                <Input
                  id="deliveryDate"
                  type="datetime-local"
                  {...register('deliveryDate')}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isFlexibleDate"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isFlexibleDate"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isFlexibleDate">
                  Dates flexibles
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isUrgent"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isUrgent"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isUrgent" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Demande urgente (+15% de frais)
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tarification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="basePrice">Prix proposé (€) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.5"
                  min="1"
                  max="10000"
                  {...register('basePrice', { valueAsNumber: true })}
                  className={errors.basePrice ? 'border-red-500' : ''}
                />
                {errors.basePrice && (
                  <p className="text-red-500 text-sm mt-1">{errors.basePrice.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isPriceNegotiable"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isPriceNegotiable"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isPriceNegotiable">
                  Prix négociable
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="requiresInsurance"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="requiresInsurance"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="requiresInsurance">
                  Assurance requise
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="allowsPartialDelivery"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="allowsPartialDelivery"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="allowsPartialDelivery">
                  Livraison partielle acceptée
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Détails spécifiques selon le type */}
        {isPackageDelivery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Détails du colis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="packageDetails.weight">Poids (kg) *</Label>
                  <Input
                    id="packageDetails.weight"
                    type="number"
                    step="0.1"
                    max="50"
                    {...register('packageDetails.weight', { valueAsNumber: true })}
                    placeholder="5.5"
                  />
                </div>
                <div>
                  <Label htmlFor="packageDetails.length">Longueur (cm) *</Label>
                  <Input
                    id="packageDetails.length"
                    type="number"
                    max="200"
                    {...register('packageDetails.length', { valueAsNumber: true })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label htmlFor="packageDetails.width">Largeur (cm) *</Label>
                  <Input
                    id="packageDetails.width"
                    type="number"
                    max="200"
                    {...register('packageDetails.width', { valueAsNumber: true })}
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label htmlFor="packageDetails.height">Hauteur (cm) *</Label>
                  <Input
                    id="packageDetails.height"
                    type="number"
                    max="200"
                    {...register('packageDetails.height', { valueAsNumber: true })}
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="packageDetails.content">Contenu du colis *</Label>
                <Input
                  id="packageDetails.content"
                  {...register('packageDetails.content')}
                  placeholder="Vêtements, livres, électronique..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="packageDetails.fragile"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="packageDetails.fragile"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="packageDetails.fragile" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Colis fragile (manipulation avec précaution)
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Récapitulatif et actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                * Champs obligatoires
              </div>
              
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit((data) => onSubmit(data, true))()}
                  disabled={isLoading}
                >
                  {saveAsDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder brouillon
                    </>
                  )}
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading || !isValid}
                >
                  {isLoading && !saveAsDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publier l'annonce
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}