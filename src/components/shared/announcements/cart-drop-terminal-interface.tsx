"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle} from "@/components/ui/dialog";
import {
  QrCode,
  Scan,
  ShoppingCart,
  User,
  MapPin,
  Clock,
  Package,
  CreditCard,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Minus,
  Search,
  Calendar,
  Euro,
  Zap} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { toast } from "sonner";

// Types pour les produits
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

// Types pour les créneaux horaires
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  delivererCount: number;
  price: number;
}

// Types pour le client
interface ClientInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  preferredDeliveryInstructions?: string;
  nfcId?: string;
  qrCode?: string;
}

// Types pour la commande
interface CartItem {
  product: Product;
  quantity: number;
  specialInstructions?: string;
}

interface CartDropOrder {
  id: string;
  items: CartItem[];
  clientInfo: ClientInfo;
  deliverySlot: TimeSlot;
  totalWeight: number;
  totalPrice: number;
  specialInstructions?: string;
  paymentMethod: "CARD" | "CASH" | "ACCOUNT";
  status: "PENDING" | "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "DELIVERED";
}

interface CartDropTerminalInterfaceProps {
  merchantId: string;
  availableProducts: Product[];
  availableTimeSlots: TimeSlot[];
  onCreateOrder: (
    order: Omit<CartDropOrder, "id" | "status">,
  ) => Promise<string>;
  onScanQR?: (data: string) => Promise<ClientInfo | null>;
  onScanNFC?: (nfcId: string) => Promise<ClientInfo | null>;
  className?: string;
}

const DELIVERY_CATEGORIES = [
  { id: "FOOD", label: "Alimentaire", icon: "🍎" },
  { id: "ELECTRONICS", label: "Électronique", icon: "📱" },
  { id: "CLOTHING", label: "Vêtements", icon: "👕" },
  { id: "HOME", label: "Maison", icon: "🏠" },
  { id: "BOOKS", label: "Livres", icon: "📚" },
  { id: "OTHER", label: "Autre", icon: "📦" }];

export const CartDropTerminalInterface: React.FC<
  CartDropTerminalInterfaceProps
> = ({ merchantId,
  availableProducts,
  availableTimeSlots,
  onCreateOrder,
  onScanQR,
  onScanNFC,
  className }) => {
  const t = useTranslations("cartDrop");

  // États du composant
  const [currentStep, setCurrentStep] = useState<
    "client" | "products" | "delivery" | "payment" | "confirmation"
  >("client");
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "CARD" | "CASH" | "ACCOUNT"
  >("CARD");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isManualClient, setIsManualClient] = useState(false);

  // États pour la saisie manuelle du client
  const [manualClientData, setManualClientData] = useState({ name: "",
    phone: "",
    email: "",
    address: "" });

  // Filtrer les produits
  const filteredProducts = availableProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.inStock;
  });

  // Calculer les totaux
  const totalWeight = cart.reduce(
    (sum, item) => sum + item.product.weight * item.quantity,
    0,
  );
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const deliveryPrice = selectedTimeSlot?.price || 0;
  const finalTotal = totalPrice + deliveryPrice;

  // Identifier le client par QR/NFC
  const handleClientIdentification = async (
    data: string,
    type: "QR" | "NFC",
  ) => {
    setIsProcessing(true);
    try {
      let client: ClientInfo | null = null;

      if (type === "QR" && onScanQR) {
        client = await onScanQR(data);
      } else if (type === "NFC" && onScanNFC) {
        client = await onScanNFC(data);
      }

      if (client) {
        setClientInfo(client);
        setCurrentStep("products");
        toast.success(t("clientIdentified", { name: client.name }));
      } else {
        toast.error(t("clientNotFound"));
      }
    } catch (error) {
      console.error("Erreur identification client:", error);
      toast.error(t("identificationError"));
    } finally {
      setIsProcessing(false);
      setShowScanner(false);
    }
  };

  // Saisie manuelle du client
  const handleManualClientEntry = () => {
    if (
      !manualClientData.name ||
      !manualClientData.phone ||
      !manualClientData.address
    ) {
      toast.error(t("fillAllFields"));
      return;
    }

    const client: ClientInfo = {
      id: `manual-${Date.now()}`,
      ...manualClientData};

    setClientInfo(client);
    setCurrentStep("products");
    toast.success(t("clientAdded"));
  };

  // Ajouter un produit au panier
  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    toast.success(t("productAdded", { name: product.name }));
  };

  // Modifier la quantité d'un produit
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.product.id !== productId));
    } else {
      setCart(
        cart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item,
        ),
      );
    }
  };

  // Créer la commande
  const handleCreateOrder = async () => {
    if (!clientInfo || !selectedTimeSlot || cart.length === 0) {
      toast.error(t("incompleteOrder"));
      return;
    }

    setIsProcessing(true);
    try {
      const order: Omit<CartDropOrder, "id" | "status"> = {
        items: cart,
        clientInfo,
        deliverySlot: selectedTimeSlot,
        totalWeight,
        totalPrice: finalTotal,
        specialInstructions,
        paymentMethod};

      const orderId = await onCreateOrder(order);
      setCurrentStep("confirmation");
      toast.success(t("orderCreated", { id }));
    } catch (error) {
      console.error("Erreur création commande:", error);
      toast.error(t("orderError"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Réinitialiser pour une nouvelle commande
  const resetOrder = () => {
    setCurrentStep("client");
    setClientInfo(null);
    setCart([]);
    setSelectedTimeSlot(null);
    setPaymentMethod("CARD");
    setSpecialInstructions("");
    setManualClientData({ name: "", phone: "", email: "", address: ""  });
    setIsManualClient(false);
  };

  // Formater le prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"}).format(price);
  };

  // Obtenir les créneaux disponibles
  const availableSlots = availableTimeSlots.filter((slot) => slot.available);

  return (
    <div className={cn("max-w-6xl mx-auto space-y-6", className)}>
      {/* Header avec étapes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6" />
            <span>{t("cartDropTerminal")}</span>
          </CardTitle>
          <CardDescription>{t("terminalDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {[
              { step: "client", label: t("steps.client"), icon: User },
              { step: "products", label: t("steps.products"), icon: Package },
              { step: "delivery", label: t("steps.delivery"), icon: Clock },
              { step: "payment", label: t("steps.payment"), icon: CreditCard },
              {
                step: "confirmation",
                label: t("steps.confirmation"),
                icon: CheckCircle}].map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full",
                    currentStep === step
                      ? "bg-primary text-primary-foreground"
                      : index <
                          [
                            "client",
                            "products",
                            "delivery",
                            "payment",
                            "confirmation"].indexOf(currentStep)
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="ml-2 text-sm font-medium">{label}</div>
                {index < 4 && <div className="w-8 h-px bg-muted mx-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Étape 1: Identification du client */}
      {currentStep === "client" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("identifyClient")}</CardTitle>
            <CardDescription>{t("identifyClientDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isManualClient ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {onScanQR && (
                    <Button
                      size="lg"
                      onClick={() => setShowScanner(true)}
                      disabled={isProcessing}
                      className="h-24"
                    >
                      <QrCode className="h-8 w-8 mr-3" />
                      <div>
                        <div className="font-medium">{t("scanQRCode")}</div>
                        <div className="text-sm opacity-75">
                          {t("qrDescription")}
                        </div>
                      </div>
                    </Button>
                  )}

                  {onScanNFC && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        // Simuler un scan NFC
                        toast.info(t("nfcReady"));
                      }}
                      disabled={isProcessing}
                      className="h-24"
                    >
                      <Scan className="h-8 w-8 mr-3" />
                      <div>
                        <div className="font-medium">{t("scanNFC")}</div>
                        <div className="text-sm opacity-75">
                          {t("nfcDescription")}
                        </div>
                      </div>
                    </Button>
                  )}
                </div>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setIsManualClient(true)}
                  >
                    {t("manualEntry")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-name">{t("clientName")}</Label>
                    <Input
                      id="client-name"
                      value={manualClientData.name}
                      onChange={(e) =>
                        setManualClientData((prev) => ({ ...prev,
                          name: e.target.value }))
                      }
                      placeholder={t("clientNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-phone">{t("clientPhone")}</Label>
                    <Input
                      id="client-phone"
                      value={manualClientData.phone}
                      onChange={(e) =>
                        setManualClientData((prev) => ({ ...prev,
                          phone: e.target.value }))
                      }
                      placeholder={t("clientPhonePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-email">{t("clientEmail")}</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={manualClientData.email}
                      onChange={(e) =>
                        setManualClientData((prev) => ({ ...prev,
                          email: e.target.value }))
                      }
                      placeholder={t("clientEmailPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-address">
                      {t("deliveryAddress")}
                    </Label>
                    <Input
                      id="client-address"
                      value={manualClientData.address}
                      onChange={(e) =>
                        setManualClientData((prev) => ({ ...prev,
                          address: e.target.value }))
                      }
                      placeholder={t("addressPlaceholder")}
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleManualClientEntry}
                    disabled={isProcessing}
                  >
                    {t("addClient")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsManualClient(false)}
                  >
                    {t("back")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Étape 2: Sélection des produits */}
      {currentStep === "products" && clientInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalogue de produits */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("selectProducts")}</CardTitle>
                <CardDescription>
                  {t("selectProductsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtres */}
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder={t("searchProducts")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t("allCategories")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("allCategories")}</SelectItem>
                      {DELIVERY_CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Liste des produits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{product.name}</h4>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {product.description}
                              </p>
                            )}
                          </div>
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded ml-2"
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-bold">
                              {formatPrice(product.price)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {product.weight}kg
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {product.isFragile && (
                              <Badge variant="outline" className="text-xs">
                                {t("fragile")}
                              </Badge>
                            )}
                            {product.needsCooling && (
                              <Badge variant="outline" className="text-xs">
                                {t("cooling")}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              onClick={() => addToCart(product)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panier */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t("cart")}
                  <Badge variant="secondary">{cart.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("emptyCart")}</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center space-x-2 p-2 border rounded"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {item.product.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(item.product.price)} ×{" "}
                              {item.quantity}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1,
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span>{t("totalWeight")}</span>
                        <span>{totalWeight.toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t("totalPrice")}</span>
                        <span className="font-bold">
                          {formatPrice(totalPrice)}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setCurrentStep("delivery")}
                      disabled={cart.length === 0}
                      className="w-full"
                    >
                      {t("continueToDelivery")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Informations client */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("clientInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{clientInfo.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-2">{clientInfo.address}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Étape 3: Créneaux de livraison */}
      {currentStep === "delivery" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("selectDeliverySlot")}</CardTitle>
            <CardDescription>
              {t("selectDeliverySlotDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableSlots.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("noSlotsAvailable")}</AlertTitle>
                <AlertDescription>{t("noSlotsDescription")}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableSlots.map((slot) => (
                  <Card
                    key={slot.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedTimeSlot?.id === slot.id &&
                        "ring-2 ring-primary border-primary",
                    )}
                    onClick={() => setSelectedTimeSlot(slot)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          {selectedTimeSlot?.id === slot.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("availableDeliverers", {
                              count: slot.delivererCount})}
                          </span>
                          <span className="font-bold">
                            {formatPrice(slot.price)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("products")}
              >
                {t("back")}
              </Button>
              <Button
                onClick={() => setCurrentStep("payment")}
                disabled={!selectedTimeSlot}
              >
                {t("continueToPayment")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 4: Paiement */}
      {currentStep === "payment" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentMethod")}</CardTitle>
            <CardDescription>{t("paymentMethodDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Résumé de la commande */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">{t("orderSummary")}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {t("products")} ({ cart.length })
                    </span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("delivery")}</span>
                    <span>{formatPrice(deliveryPrice)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>{t("total")}</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Méthodes de paiement */}
            <div className="space-y-4">
              <Label>{t("choosePaymentMethod")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    value: "CARD",
                    label: t("paymentMethods.card"),
                    icon: CreditCard},
                  {
                    value: "CASH",
                    label: t("paymentMethods.cash"),
                    icon: Euro},
                  {
                    value: "ACCOUNT",
                    label: t("paymentMethods.account"),
                    icon: User}].map(({ value, label, icon: Icon  }) => (
                  <Card
                    key={value}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      paymentMethod === value &&
                        "ring-2 ring-primary border-primary",
                    )}
                    onClick={() => setPaymentMethod(value as any)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className="h-8 w-8 mx-auto mb-2" />
                      <div className="font-medium">{label}</div>
                      {paymentMethod === value && (
                        <CheckCircle className="h-5 w-5 text-primary mx-auto mt-2" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Instructions spéciales */}
            <div className="space-y-2">
              <Label htmlFor="special-instructions">
                {t("specialInstructions")}
              </Label>
              <Textarea
                id="special-instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder={t("specialInstructionsPlaceholder")}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("delivery")}
              >
                {t("back")}
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {t("confirmOrder")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 5: Confirmation */}
      {currentStep === "confirmation" && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("orderConfirmed")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("orderConfirmedDescription")}
            </p>

            <div className="flex justify-center space-x-4">
              <Button onClick={resetOrder}>{t("newOrder")}</Button>
              <Button variant="outline" onClick={() => window.print()}>
                {t("printReceipt")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Scanner QR */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scanQRCode")}</DialogTitle>
            <DialogDescription>{t("scanQRDescription")}</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <QrCode className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("scannerReady")}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowScanner(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CartDropTerminalInterface;
