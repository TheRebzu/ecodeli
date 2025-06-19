"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  Building2,
  Wallet,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils/common";
import { useToast } from "@/components/ui/use-toast";
import { 
  type PaymentMethod,
  type CreatePaymentMethodData,
  formatPaymentAmount,
  getPaymentMethodIcon,
  isPaymentMethodExpired,
} from "@/types/client/payments";
import { useClientPayments } from "@/hooks/client/use-client-payments";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaymentMethodManagerProps {
  showAddButton?: boolean;
  maxDisplay?: number;
  allowDelete?: boolean;
  allowSetDefault?: boolean;
}

export function PaymentMethodManager({
  showAddButton = true,
  maxDisplay,
  allowDelete = true,
  allowSetDefault = true,
}: PaymentMethodManagerProps) {
  const t = useTranslations("payments");
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<CreatePaymentMethodData>({
    type: "card",
    billingDetails: {
      name: "",
      email: "",
      phone: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        postalCode: "",
        country: "FR",
      },
    },
    saveForFuture: true,
  });

  // Utilisation du hook unifié pour la gestion des paiements
  const {
    paymentMethods,
    isLoadingPaymentMethods,
    error,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    refetchPaymentMethods,
    isAddingPaymentMethod,
    isRemovingPaymentMethod,
    isSettingDefaultPaymentMethod,
  } = useClientPayments();

  const handleAddPaymentMethod = async () => {
    try {
      await addPaymentMethod(newPaymentMethod);
      setIsAddDialogOpen(false);
      setNewPaymentMethod({
        type: "card",
        billingDetails: {
          name: "",
          email: "",
          phone: "",
          address: {
            line1: "",
            line2: "",
            city: "",
            postalCode: "",
            country: "FR",
          },
        },
        saveForFuture: true,
      });
    } catch (error) {
      console.error("Error adding payment method:", error);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    try {
      await removePaymentMethod(paymentMethodId);
    } catch (error) {
      console.error("Error removing payment method:", error);
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      await setDefaultPaymentMethod(paymentMethodId);
    } catch (error) {
      console.error("Error setting default payment method:", error);
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    switch (method.type) {
      case "card":
        return method.card 
          ? `${method.card.brand.toUpperCase()} •••• ${method.card.last4}`
          : t("creditCard");
      case "sepa_debit":
        return method.sepaDebit
          ? `${t("sepaDebit")} •••• ${method.sepaDebit.last4}`
          : t("sepaDebit");
      case "paypal":
        return method.wallet?.email || t("paypal");
      case "wallet":
        return t("digitalWallet");
      case "bank_transfer":
        return t("bankTransfer");
      default:
        return t("paymentMethod");
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case "card":
        return <CreditCard className="h-5 w-5" />;
      case "sepa_debit":
        return <Building2 className="h-5 w-5" />;
      case "paypal":
      case "wallet":
        return <Wallet className="h-5 w-5" />;
      case "bank_transfer":
        return <Building2 className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getPaymentMethodDetails = (method: PaymentMethod): string => {
    if (method.type === "card" && method.card) {
      const expiry = `${method.card.expMonth.toString().padStart(2, "0")}/${method.card.expYear}`;
      return `${t("expires")} ${expiry}`;
    }
    if (method.type === "sepa_debit" && method.sepaDebit) {
      return `${method.sepaDebit.country} - ${method.sepaDebit.bankCode}`;
    }
    return "";
  };

  const displayedMethods = maxDisplay 
    ? paymentMethods.slice(0, maxDisplay)
    : paymentMethods;

  if (isLoadingPaymentMethods) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("paymentMethods")}
          </CardTitle>
          <CardDescription>
            {t("managePaymentMethods")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("paymentMethods")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t("errorLoadingPaymentMethods")}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => refetchPaymentMethods()}
            >
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("paymentMethods")}
            </CardTitle>
            <CardDescription>
              {t("managePaymentMethods")}
            </CardDescription>
          </div>
          {showAddButton && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addPaymentMethod")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{t("addNewPaymentMethod")}</DialogTitle>
                  <DialogDescription>
                    {t("addPaymentMethodDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("paymentMethodType")}</Label>
                    <Select 
                      value={newPaymentMethod.type} 
                      onValueChange={(value) => 
                        setNewPaymentMethod(prev => ({ 
                          ...prev, 
                          type: value as PaymentMethod["type"] 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">{t("creditCard")}</SelectItem>
                        <SelectItem value="sepa_debit">{t("sepaDebit")}</SelectItem>
                        <SelectItem value="paypal">{t("paypal")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newPaymentMethod.type === "card" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("cardNumber")}</Label>
                          <Input
                            placeholder="1234 5678 9012 3456"
                            value={newPaymentMethod.card?.number || ""}
                            onChange={(e) =>
                              setNewPaymentMethod(prev => ({
                                ...prev,
                                card: { ...prev.card!, number: e.target.value }
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("cvc")}</Label>
                          <Input
                            placeholder="123"
                            value={newPaymentMethod.card?.cvc || ""}
                            onChange={(e) =>
                              setNewPaymentMethod(prev => ({
                                ...prev,
                                card: { ...prev.card!, cvc: e.target.value }
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("expiryMonth")}</Label>
                          <Input
                            type="number"
                            placeholder="MM"
                            min="1"
                            max="12"
                            value={newPaymentMethod.card?.expMonth || ""}
                            onChange={(e) =>
                              setNewPaymentMethod(prev => ({
                                ...prev,
                                card: { ...prev.card!, expMonth: parseInt(e.target.value) }
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("expiryYear")}</Label>
                          <Input
                            type="number"
                            placeholder="YYYY"
                            min="2024"
                            value={newPaymentMethod.card?.expYear || ""}
                            onChange={(e) =>
                              setNewPaymentMethod(prev => ({
                                ...prev,
                                card: { ...prev.card!, expYear: parseInt(e.target.value) }
                              }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>{t("cardholderName")}</Label>
                    <Input
                      value={newPaymentMethod.billingDetails.name}
                      onChange={(e) =>
                        setNewPaymentMethod(prev => ({
                          ...prev,
                          billingDetails: {
                            ...prev.billingDetails,
                            name: e.target.value
                          }
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("email")}</Label>
                    <Input
                      type="email"
                      value={newPaymentMethod.billingDetails.email}
                      onChange={(e) =>
                        setNewPaymentMethod(prev => ({
                          ...prev,
                          billingDetails: {
                            ...prev.billingDetails,
                            email: e.target.value
                          }
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isAddingPaymentMethod}
                  >
                    {t("cancel")}
                  </Button>
                  <Button 
                    onClick={handleAddPaymentMethod}
                    disabled={isAddingPaymentMethod}
                  >
                    {isAddingPaymentMethod && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("addPaymentMethod")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {t("noPaymentMethods")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("noPaymentMethodsDescription")}
            </p>
            {showAddButton && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("addFirstPaymentMethod")}
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedMethods.map((method) => (
              <div
                key={method.id}
                className={cn(
                  "flex items-center justify-between p-4 border rounded-lg transition-colors",
                  method.isDefault && "ring-2 ring-primary ring-opacity-20 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {getPaymentMethodIcon(method)}
                    {method.isDefault && (
                      <div className="absolute -top-1 -right-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getPaymentMethodLabel(method)}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          {t("default")}
                        </Badge>
                      )}
                      {isPaymentMethodExpired(method) && (
                        <Badge variant="destructive" className="text-xs">
                          {t("expired")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getPaymentMethodDetails(method)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {allowSetDefault && !method.isDefault && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            disabled={isSettingDefaultPaymentMethod}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("setAsDefault")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {allowDelete && !method.isDefault && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={isRemovingPaymentMethod}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("removePaymentMethod")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("removePaymentMethodConfirmation")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRemovePaymentMethod(method.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("remove")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}

            {maxDisplay && paymentMethods.length > maxDisplay && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("viewAllPaymentMethods")} ({paymentMethods.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}