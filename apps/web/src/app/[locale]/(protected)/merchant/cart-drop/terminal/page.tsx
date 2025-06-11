'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Settings,
  Users,
  Package,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Link } from '@/navigation';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';
import { toast } from 'sonner';
import { CartDropTerminalInterface } from '@/components/shared/announcements/cart-drop-terminal-interface';

// Types pour les produits (simulation)
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  weight: number;
  category: string;
  isFragile: boolean;
  needsCooling: boolean;
  image?: string;
  inStock: boolean;
  barcode?: string;
}

// Types pour les créneaux horaires (simulation)
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  delivererCount: number;
  price: number;
}

// Types pour les informations du commerçant
interface MerchantInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  cartDropEnabled: boolean;
}

export default function CartDropTerminalPage() {
  useRoleProtection(['MERCHANT']);
  const t = useTranslations('cartDrop');
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState({
    orders: 0,
    revenue: 0,
    deliveries: 0,
    avgRating: 0,
  });

  // Charger les données du commerçant et de la borne
  useEffect(() => {
    const loadTerminalData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simuler le chargement des données
        setTimeout(() => {
          // Informations du commerçant
          const mockMerchantInfo: MerchantInfo = {
            id: 'merchant-1',
            name: 'Supermarché EcoDeli',
            address: '123 Avenue des Champs-Élysées, 75008 Paris',
            phone: '+33 1 23 45 67 89',
            email: 'contact@supermarche-ecodeli.fr',
            isActive: true,
            cartDropEnabled: true,
          };

          // Produits disponibles
          const mockProducts: Product[] = [
            {
              id: 'prod-1',
              name: 'Pain de mie complet',
              description: 'Pain de mie bio aux céréales complètes',
              price: 3.50,
              weight: 0.5,
              category: 'FOOD',
              isFragile: false,
              needsCooling: false,
              inStock: true,
              barcode: '1234567890123',
            },
            {
              id: 'prod-2',
              name: 'Lait frais bio 1L',
              description: 'Lait frais bio demi-écrémé',
              price: 1.80,
              weight: 1.0,
              category: 'FOOD',
              isFragile: false,
              needsCooling: true,
              inStock: true,
              barcode: '2345678901234',
            },
            {
              id: 'prod-3',
              name: 'Smartphone Samsung Galaxy',
              description: 'Smartphone Samsung Galaxy S24',
              price: 899.00,
              weight: 0.2,
              category: 'ELECTRONICS',
              isFragile: true,
              needsCooling: false,
              inStock: true,
              barcode: '3456789012345',
            },
            {
              id: 'prod-4',
              name: 'T-shirt bio coton',
              description: 'T-shirt en coton bio, taille M',
              price: 29.90,
              weight: 0.2,
              category: 'CLOTHING',
              isFragile: false,
              needsCooling: false,
              inStock: true,
              barcode: '4567890123456',
            },
            {
              id: 'prod-5',
              name: 'Livre de cuisine',
              description: 'Guide de cuisine française traditionnelle',
              price: 24.90,
              weight: 0.8,
              category: 'BOOKS',
              isFragile: false,
              needsCooling: false,
              inStock: true,
              barcode: '5678901234567',
            },
            {
              id: 'prod-6',
              name: 'Yaourts nature bio x12',
              description: 'Pack de 12 yaourts nature bio',
              price: 4.20,
              weight: 1.5,
              category: 'FOOD',
              isFragile: false,
              needsCooling: true,
              inStock: true,
              barcode: '6789012345678',
            },
          ];

          // Créneaux horaires disponibles
          const mockTimeSlots: TimeSlot[] = [
            {
              id: 'slot-1',
              startTime: '09:00',
              endTime: '11:00',
              available: true,
              delivererCount: 3,
              price: 5.90,
            },
            {
              id: 'slot-2',
              startTime: '11:00',
              endTime: '13:00',
              available: true,
              delivererCount: 5,
              price: 4.90,
            },
            {
              id: 'slot-3',
              startTime: '13:00',
              endTime: '15:00',
              available: false,
              delivererCount: 0,
              price: 6.90,
            },
            {
              id: 'slot-4',
              startTime: '15:00',
              endTime: '17:00',
              available: true,
              delivererCount: 4,
              price: 5.90,
            },
            {
              id: 'slot-5',
              startTime: '17:00',
              endTime: '19:00',
              available: true,
              delivererCount: 6,
              price: 7.90,
            },
            {
              id: 'slot-6',
              startTime: '19:00',
              endTime: '21:00',
              available: true,
              delivererCount: 2,
              price: 8.90,
            },
          ];

          // Statistiques du jour
          const mockTodayStats = {
            orders: 27,
            revenue: 485.60,
            deliveries: 23,
            avgRating: 4.7,
          };

          setMerchantInfo(mockMerchantInfo);
          setProducts(mockProducts);
          setTimeSlots(mockTimeSlots);
          setTodayStats(mockTodayStats);
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement de la borne';
        setError(message);
        setIsLoading(false);
      }
    };

    loadTerminalData();
  }, []);

  // Gérer la création d'une commande
  const handleCreateOrder = async (orderData: any): Promise<string> => {
    try {
      // Simuler la création de commande
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const orderId = `CMD-${Date.now()}`;
      
      console.log('Nouvelle commande créée:', {
        orderId,
        ...orderData,
      });

      // Mettre à jour les statistiques
      setTodayStats(prev => ({
        ...prev,
        orders: prev.orders + 1,
        revenue: prev.revenue + orderData.totalPrice,
      }));

      toast.success(t('orderCreatedSuccess', { orderId }));
      return orderId;
    } catch (error) {
      console.error('Erreur création commande:', error);
      throw new Error(t('orderCreationError'));
    }
  };

  // Identifier un client par QR code
  const handleScanQR = async (qrData: string) => {
    try {
      // Simuler l'identification par QR
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Parser les données QR (simulation)
      const clientData = JSON.parse(qrData);
      
      return {
        id: clientData.id || 'client-qr-123',
        name: clientData.name || 'Client QR Scan',
        phone: clientData.phone || '+33 6 12 34 56 78',
        email: clientData.email || 'client@example.com',
        address: clientData.address || '456 Rue de la Paix, 75002 Paris',
        qrCode: qrData,
      };
    } catch (error) {
      console.error('Erreur scan QR:', error);
      return null;
    }
  };

  // Identifier un client par NFC
  const handleScanNFC = async (nfcId: string) => {
    try {
      // Simuler l'identification par NFC
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        id: `client-nfc-${nfcId}`,
        name: 'Client NFC',
        phone: '+33 6 98 76 54 32',
        email: 'client.nfc@example.com',
        address: '789 Boulevard Saint-Germain, 75006 Paris',
        nfcId: nfcId,
      };
    } catch (error) {
      console.error('Erreur scan NFC:', error);
      return null;
    }
  };

  // Affichage de chargement
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Affichage d'erreur
  if (error || !merchantInfo) {
    return (
      <div className="container py-6">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>
              {error || t('terminalNotFound')}
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href="/merchant/announcements">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToAnnouncements')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Vérifier si le service cart drop est activé
  if (!merchantInfo.cartDropEnabled) {
    return (
      <div className="container py-6">
        <div className="max-w-6xl mx-auto">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertTitle>{t('serviceDisabled')}</AlertTitle>
            <AlertDescription>
              {t('cartDropNotEnabled')}
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex space-x-4">
            <Button variant="outline" asChild>
              <Link href="/merchant/announcements">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToAnnouncements')}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/merchant/settings">
                <Settings className="mr-2 h-4 w-4" />
                {t('enableService')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('terminalTitle')}</h1>
          <p className="text-muted-foreground mt-1">
            {merchantInfo.name} - {t('cartDropService')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={merchantInfo.isActive ? 'default' : 'secondary'}>
            {merchantInfo.isActive ? t('online') : t('offline')}
          </Badge>
          <Button variant="outline" asChild>
            <Link href="/merchant/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistiques du jour */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('todayOrders')}</p>
                <p className="text-2xl font-bold">{todayStats.orders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('todayRevenue')}</p>
                <p className="text-2xl font-bold">{formatCurrency(todayStats.revenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('deliveriesCompleted')}</p>
                <p className="text-2xl font-bold">{todayStats.deliveries}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('avgRating')}</p>
                <p className="text-2xl font-bold">{todayStats.avgRating.toFixed(1)} ⭐</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Informations du commerçant */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>{t('merchantInfo')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">{t('storeName')}</p>
              <p className="text-muted-foreground">{merchantInfo.name}</p>
            </div>
            <div>
              <p className="font-medium">{t('address')}</p>
              <p className="text-muted-foreground">{merchantInfo.address}</p>
            </div>
            <div>
              <p className="font-medium">{t('contact')}</p>
              <p className="text-muted-foreground">{merchantInfo.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interface de la borne */}
      <CartDropTerminalInterface
        merchantId={merchantInfo.id}
        availableProducts={products}
        availableTimeSlots={timeSlots}
        onCreateOrder={handleCreateOrder}
        onScanQR={handleScanQR}
        onScanNFC={handleScanNFC}
      />

      {/* Statut des créneaux */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>{t('deliverySlots')}</span>
          </CardTitle>
          <CardDescription>{t('availableDeliverySlots')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeSlots.map(slot => (
              <div
                key={slot.id}
                className={`p-4 rounded-lg border ${
                  slot.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {slot.startTime} - {slot.endTime}
                  </span>
                  <Badge variant={slot.available ? 'default' : 'secondary'}>
                    {slot.available ? t('available') : t('full')}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>{t('deliverers')}: {slot.delivererCount}</p>
                  <p>{t('price')}: {formatCurrency(slot.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}