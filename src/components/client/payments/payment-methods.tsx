"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit, 
  Star, 
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
  Lock
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentMethod {
  id: string;
  type: "CARD" | "BANK_TRANSFER" | "PAYPAL" | "STRIPE";
  cardLast4?: string;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: Date;
  name: string;
}

export default function PaymentMethods() {
  const t = useTranslations("payments.methods");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCardData, setNewCardData] = useState({
    name: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    holderName: ""
  });

  // Récupération des méthodes de paiement
  const { data: paymentMethods, isLoading, refetch } = api.client.getPaymentMethods.useQuery();
  
  // Mutations
  const addPaymentMethodMutation = api.client.addPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success(t("addSuccess"));
      setIsAddDialogOpen(false);
      setNewCardData({
        name: "",
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: "",
        holderName: ""
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t("addError"));
    }
  });

  const removePaymentMethodMutation = api.client.removePaymentMethod.useMutation({
    onSuccess: () => {
      toast.success(t("removeSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t("removeError"));
    }
  });

  const setDefaultPaymentMethodMutation = api.client.setDefaultPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success(t("defaultSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t("defaultError"));
    }
  });

  const handleAddPaymentMethod = async () => {
    try {
      await addPaymentMethodMutation.mutateAsync({
        type: "CARD",
        name: newCardData.name,
        cardNumber: newCardData.cardNumber,
        expiryMonth: parseInt(newCardData.expiryMonth),
        expiryYear: parseInt(newCardData.expiryYear),
        cvv: newCardData.cvv,
        holderName: newCardData.holderName
      });
    } catch (error) {
      console.error("Error adding payment method:", error);
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    if (confirm(t("confirmRemove"))) {
      await removePaymentMethodMutation.mutateAsync({ id });
    }
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultPaymentMethodMutation.mutateAsync({ id });
  };

  const getCardBrandIcon = (brand: string) => {
    // Retourner l'icône appropriée selon la marque
    return <CreditCard className="h-6 w-6" />;
  };

  const getMethodTypeLabel = (type: string) => {
    switch (type) {
      case "CARD": return t("types.card");
      case "BANK_TRANSFER": return t("types.bankTransfer");
      case "PAYPAL": return t("types.paypal");
      case "STRIPE": return t("types.stripe");
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("addMethod")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("addCard")}</DialogTitle>
              <DialogDescription>{t("addCardDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("form.name")}</Label>
                <Input
                  id="name"
                  value={newCardData.name}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t("form.namePlaceholder")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardNumber">{t("form.cardNumber")}</Label>
                <Input
                  id="cardNumber"
                  value={newCardData.cardNumber}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, cardNumber: e.target.value }))}
                  placeholder="•••• •••• •••• ••••"
                  maxLength={19}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="holderName">{t("form.holderName")}</Label>
                <Input
                  id="holderName"
                  value={newCardData.holderName}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, holderName: e.target.value }))}
                  placeholder={t("form.holderNamePlaceholder")}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>{t("form.expiryMonth")}</Label>
                  <Select value={newCardData.expiryMonth} onValueChange={(value) => setNewCardData(prev => ({ ...prev, expiryMonth: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                          {month.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("form.expiryYear")}</Label>
                  <Select value={newCardData.expiryYear} onValueChange={(value) => setNewCardData(prev => ({ ...prev, expiryYear: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="YY" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">{t("form.cvv")}</Label>
                  <Input
                    id="cvv"
                    value={newCardData.cvv}
                    onChange={(e) => setNewCardData(prev => ({ ...prev, cvv: e.target.value }))}
                    placeholder="•••"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {t("form.cancel")}
                </Button>
                <Button 
                  onClick={handleAddPaymentMethod}
                  disabled={addPaymentMethodMutation.isPending}
                >
                  {addPaymentMethodMutation.isPending ? t("form.adding") : t("form.add")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Méthodes de paiement existantes */}
      <div className="space-y-4">
        {paymentMethods && paymentMethods.length > 0 ? (
          paymentMethods.map((method: PaymentMethod) => (
            <Card key={method.id} className={method.isDefault ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {getCardBrandIcon(method.cardBrand || "generic")}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{method.name}</h3>
                        {method.isDefault && (
                          <Badge variant="default">
                            <Star className="h-3 w-3 mr-1" />
                            {t("default")}
                          </Badge>
                        )}
                        {method.isVerified ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("verified")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {t("pending")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{getMethodTypeLabel(method.type)}</span>
                        {method.cardLast4 && (
                          <>
                            <span>•</span>
                            <span>•••• {method.cardLast4}</span>
                          </>
                        )}
                        {method.expiryMonth && method.expiryYear && (
                          <>
                            <span>•</span>
                            <span>{method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{t("addedOn")} {format(method.createdAt, "dd MMM yyyy", { locale: fr })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                        disabled={setDefaultPaymentMethodMutation.isPending}
                      >
                        {t("setDefault")}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRemovePaymentMethod(method.id)}
                      disabled={removePaymentMethodMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("noMethods")}</h3>
              <p className="text-muted-foreground mb-4">{t("noMethodsDescription")}</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("addFirstMethod")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Informations de sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("security.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Lock className="h-4 w-4 text-green-600" />
              <span className="text-sm">{t("security.encrypted")}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm">{t("security.pciCompliant")}</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">{t("security.noStorage")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
