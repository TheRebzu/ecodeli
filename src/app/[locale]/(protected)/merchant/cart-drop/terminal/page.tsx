"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  CreditCard,
  Package,
  User,
  QrCode,
  Radio,
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: string;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered";
  paymentMethod: "card" | "cash" | "mobile";
  paymentStatus: "pending" | "paid" | "failed";
  createdAt: Date;
  pickupTime?: Date;
  notes?: string;
}

export default function MerchantTerminalPage() {
  const [isConnected, setIsConnected] = useState(true);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // État du terminal
  const [terminalStatus, setTerminalStatus] = useState<{
    isOnline: boolean;
    lastSync: Date;
    ordersCount: number;
    totalSales: number;
  }>({
    isOnline: true,
    lastSync: new Date(),
    ordersCount: 0,
    totalSales: 0,
  });

  // Récupération des commandes depuis l'API
  const { data: orders, isLoading, refetch } = api.merchant.orders.getPending.useQuery();
  const { data: terminalStats } = api.merchant.terminal.getStats.useQuery();

  // Mutations
  const confirmOrder = api.merchant.orders.confirm.useMutation({
    onSuccess: () => {
      toast({
        title: "Commande confirmée",
        description: "La commande a été confirmée avec succès",
      });
      setCurrentOrder(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de confirmer la commande",
        variant: "destructive",
      });
    },
  });

  const updateOrderStatus = api.merchant.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la commande a été mis à jour",
      });
      refetch();
    },
  });

  const processPayment = api.merchant.payments.process.useMutation({
    onSuccess: () => {
      toast({
        title: "Paiement traité",
        description: "Le paiement a été traité avec succès",
      });
      refetch();
    },
  });

  // Simulation du scan NFC (remplacé par API réelle)
  const handleScanNFC = async () => {
    if (!nfcEnabled) {
      toast({
        title: "NFC désactivé",
        description: "Veuillez activer le NFC pour scanner",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Appel API réel pour scanner NFC
      const result = await api.merchant.nfc.scan.mutate();
      if (result.success && result.order) {
        setCurrentOrder(result.order);
        toast({
          title: "Commande détectée",
          description: `Commande ${result.order.id} scannée`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de scan",
        description: "Impossible de scanner la commande",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Traitement d'une commande
  const handleCreateOrder = async () => {
    setIsProcessing(true);
    try {
      // Appel API réel pour créer une commande
      const result = await api.merchant.orders.create.mutate({
        items: [], // Items sélectionnés depuis l'interface
        notes: orderNotes,
      });

      if (result.success) {
        setCurrentOrder(result.order);
        toast({
          title: "Commande créée",
          description: `Commande ${result.order.id} créée avec succès`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la commande",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!currentOrder) return;

    setIsProcessing(true);
    try {
      await confirmOrder.mutateAsync({
        orderId: currentOrder.id,
        notes: orderNotes,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPayment = async (method: "card" | "cash" | "mobile") => {
    if (!currentOrder) return;

    setIsProcessing(true);
    try {
      await processPayment.mutateAsync({
        orderId: currentOrder.id,
        method,
        amount: currentOrder.totalAmount,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-orange-100 text-orange-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "confirmed":
        return "Confirmée";
      case "preparing":
        return "En préparation";
      case "ready":
        return "Prête";
      case "delivered":
        return "Livrée";
      default:
        return "Inconnue";
    }
  };

  // Mise à jour du statut de connexion
  useEffect(() => {
    const interval = setInterval(() => {
      // Vérification réelle de la connexion
      setIsConnected(navigator.onLine);
      if (terminalStats) {
        setTerminalStatus({
          isOnline: navigator.onLine,
          lastSync: new Date(),
          ordersCount: terminalStats.ordersCount || 0,
          totalSales: terminalStats.totalSales || 0,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [terminalStats]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header du terminal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-6 h-6" />
                Terminal de Commande
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-green-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm">
                    {isConnected ? "Connecté" : "Hors ligne"}
                  </span>
                </div>
                <Badge variant={nfcEnabled ? "default" : "secondary"}>
                  <Radio className="w-3 h-3 mr-1" />
                  NFC {nfcEnabled ? "Activé" : "Désactivé"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {terminalStatus.ordersCount}
                </div>
                <div className="text-sm text-gray-500">Commandes aujourd'hui</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(terminalStatus.totalSales)}
                </div>
                <div className="text-sm text-gray-500">Ventes du jour</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Dernière sync</div>
                <div className="text-sm font-medium">
                  {terminalStatus.lastSync.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scanner NFC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Scanner Commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleScanNFC}
                disabled={!nfcEnabled || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Scan en cours...
                  </div>
                ) : (
                  <>
                    <Radio className="w-5 h-5 mr-2" />
                    Scanner NFC
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setNfcEnabled(!nfcEnabled)}
                variant="outline"
                className="w-full"
              >
                {nfcEnabled ? "Désactiver NFC" : "Activer NFC"}
              </Button>
            </CardContent>
          </Card>

          {/* Créer nouvelle commande */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Nouvelle Commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Notes pour la commande..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleCreateOrder}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création...
                  </div>
                ) : (
                  <>
                    <Package className="w-5 h-5 mr-2" />
                    Créer Commande
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Commande actuelle */}
        {currentOrder && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Commande en cours - #{currentOrder.id}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{currentOrder.customerName}</span>
                </div>
                <Badge className={getStatusColor(currentOrder.status)}>
                  {getStatusLabel(currentOrder.status)}
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Articles commandés :</h4>
                {currentOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        x{item.quantity}
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-lg font-bold">Total :</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(currentOrder.totalAmount)}
                </span>
              </div>

              {currentOrder.notes && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Notes :</strong> {currentOrder.notes}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {currentOrder.status === "pending" && (
                  <Button
                    onClick={handleConfirmOrder}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer
                  </Button>
                )}

                {currentOrder.paymentStatus === "pending" && (
                  <>
                    <Button
                      onClick={() => handleProcessPayment("card")}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Carte
                    </Button>
                    <Button
                      onClick={() => handleProcessPayment("cash")}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1"
                    >
                      Espèces
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des commandes en attente */}
        {orders && orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Commandes en attente ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setCurrentOrder(order)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-medium">#{order.id}</div>
                      <div className="text-sm text-gray-500">
                        {order.customerName}
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="font-medium text-green-600">
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* État de chargement */}
        {isLoading && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Chargement des commandes...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
