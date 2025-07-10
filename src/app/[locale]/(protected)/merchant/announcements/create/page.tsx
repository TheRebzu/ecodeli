"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Plane, 
  Globe,
  Upload,
  ArrowLeft,
  Zap,
  Clock,
  Shield
} from 'lucide-react';
import { useTranslations } from 'next-intl';

const ANNOUNCEMENT_TYPES = [
  {
    id: 'PACKAGE_DELIVERY',
    title: 'Livraison de Colis',
    description: 'Livraison classique de colis entre deux points',
    icon: Package,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    features: ['Suivi temps réel', 'Assurance incluse', 'Validation par code'],
    href: '/merchant/announcements/create/single?type=PACKAGE_DELIVERY',
    popular: false
  },
  {
    id: 'CART_DROP',
    title: 'Lâcher de Chariot',
    description: 'Service phare - Livraison à domicile depuis votre magasin',
    icon: ShoppingCart,
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    features: ['Intégration caisse', 'Créneaux flexibles', 'Fidélisation client'],
    href: '/merchant/announcements/create/cart-drop',
    popular: true
  },
  {
    id: 'PERSON_TRANSPORT',
    title: 'Transport de Personne',
    description: 'Transport quotidien ou ponctuel de personnes',
    icon: Users,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
    features: ['Livreurs vérifiés', 'Assurance personnes', 'Suivi trajet'],
    href: '/merchant/announcements/create/single?type=PERSON_TRANSPORT',
    popular: false
  },
  {
    id: 'AIRPORT_TRANSFER',
    title: 'Transfert Aéroport',
    description: 'Navette départ/arrivée aéroports',
    icon: Plane,
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-600',
    features: ['Horaires flexibles', 'Bagages autorisés', 'Ponctualité garantie'],
    href: '/merchant/announcements/create/single?type=AIRPORT_TRANSFER',
    popular: false
  },
  {
    id: 'SHOPPING',
    title: 'Service de Courses',
    description: 'Courses effectuées par nos livreurs',
    icon: Package,
    color: 'bg-yellow-50 border-yellow-200',
    iconColor: 'text-yellow-600',
    features: ['Liste fournie', 'Photos preuves', 'Ticket de caisse'],
    href: '/merchant/announcements/create/single?type=SHOPPING',
    popular: false
  },
  {
    id: 'INTERNATIONAL_PURCHASE',
    title: 'Achat International',
    description: 'Rapporter des produits depuis l\'étranger',
    icon: Globe,
    color: 'bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-600',
    features: ['Douane incluse', 'Produits spécifiques', 'Authentification'],
    href: '/merchant/announcements/create/single?type=INTERNATIONAL_PURCHASE',
    popular: false
  }
];

const BULK_OPTIONS = [
  {
    id: 'csv-import',
    title: 'Import CSV/Excel',
    description: 'Importez plusieurs annonces via fichier',
    icon: Upload,
    href: '/merchant/announcements/create/bulk',
    features: ['Format standardisé', 'Validation automatique', 'Aperçu avant import']
  }
];

export default function CreateAnnouncementPage() {
  const t = useTranslations('merchant.announcements.create');

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/merchant/announcements">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux annonces
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Créer une Annonce</h1>
          <p className="text-muted-foreground">
            Choisissez le type d'annonce que vous souhaitez créer
          </p>
        </div>
      </div>

      {/* Types d'annonces individuelles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Annonces Individuelles</h2>
          <Badge variant="outline">Recommandé</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ANNOUNCEMENT_TYPES.map((type) => (
            <Card 
              key={type.id} 
              className={`relative hover:shadow-lg transition-all duration-200 cursor-pointer ${type.color}`}
            >
              {type.popular && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-orange-500 text-white">
                    <Zap className="h-3 w-3 mr-1" />
                    Populaire
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type.iconColor} bg-white`}>
                    <type.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    {type.popular && (
                      <Badge variant="secondary" className="text-xs">
                        Service phare
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {type.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <Button asChild className="w-full">
                  <Link href={type.href}>
                    Créer cette annonce
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Options d'import en masse */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Import en Masse</h2>
          <Badge variant="outline">Pour gros volumes</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BULK_OPTIONS.map((option) => (
            <Card key={option.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <option.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href={option.href}>
                    Commencer l'import
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Informations supplémentaires */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Informations Importantes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-blue-800">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-blue-600" />
            <div className="text-sm">
              <strong>Validation :</strong> Vos annonces sont validées automatiquement si vous avez un contrat actif.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package className="h-4 w-4 mt-0.5 text-blue-600" />
            <div className="text-sm">
              <strong>Limites :</strong> Respectez les limites de votre contrat (services autorisés, volume mensuel).
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 mt-0.5 text-blue-600" />
            <div className="text-sm">
              <strong>Assurance :</strong> Toutes les livraisons sont couvertes selon votre niveau d'abonnement.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 