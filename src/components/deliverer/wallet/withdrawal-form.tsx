"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  Info,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Schéma de validation pour le formulaire de retrait
const withdrawalSchema = z.object({
  amount: z
    .number()
    .min(10, "Le montant minimum de retrait est de 10€")
    .max(5000, "Le montant maximum de retrait est de 5000€"),
  method: z.enum(["bank_transfer", "paypal"], {
    required_error: "Veuillez sélectionner une méthode de retrait",
  }),
  bankDetails: z.object({
    accountName: z.string().min(2, "Le nom du titulaire est requis"),
    iban: z.string().min(15, "L'IBAN doit contenir au moins 15 caractères"),
    bic: z.string().min(8, "Le BIC doit contenir au moins 8 caractères"),
  }).optional(),
  description: z.string().optional(),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

interface WithdrawalFormProps {
  walletBalance: number;
  currency?: string;
  minimumAmount?: number;
  onSubmit: (data: WithdrawalFormValues) => Promise<void>;
  isLoading?: boolean;
  savedBankDetails?: {
    accountName: string;
    iban: string;
    bic: string;
  } | null;
  onCancel?: () => void;
}

export function WithdrawalForm({
  walletBalance,
  currency = "EUR",
  minimumAmount = 20,
  onSubmit,
  isLoading = false,
  savedBankDetails = null,
  onCancel,
}: WithdrawalFormProps) {
  const t = useTranslations("Wallet.withdrawal");
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"bank_transfer" | "paypal">("bank_transfer");

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 0,
      method: "bank_transfer",
      bankDetails: savedBankDetails || {
        accountName: "",
        iban: "",
        bic: "",
      },
      description: "",
    },
  });

  const handleSubmit = async (data: WithdrawalFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Appel API réel pour traiter le retrait - pas de simulation
      await onSubmit(data);
      
      toast({
        title: t("withdrawalRequested"),
        description: t("withdrawalProcessingMessage"),
      });
      
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error instanceof Error ? error.message : t("unknownError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // Préremplit avec le montant maximum
  const setMaxAmount = () => {
    form.setValue("amount", walletBalance);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5" />
          {t("requestWithdrawal")}
        </CardTitle>
        <CardDescription>
          {t("withdrawalDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Montant */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("amount")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        €
                      </span>
                      <Input
                        {...field}
                        type="number"
                        min={minimumAmount}
                        max={walletBalance}
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                        onClick={setMaxAmount}
                      >
                        Max
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t("availableBalance")}: {formatCurrency(walletBalance, currency)}
                    <br />
                    {t("minimumAmount")}: {formatCurrency(minimumAmount, currency)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Méthode de retrait */}
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("withdrawalMethod")}</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedMethod(value as "bank_transfer" | "paypal");
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectMethod")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {t("bankTransfer")}
                        </div>
                      </SelectItem>
                      <SelectItem value="paypal">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          PayPal
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Détails bancaires pour virement */}
            {selectedMethod === "bank_transfer" && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("bankDetails")}
                </h4>
                
                <FormField
                  control={form.control}
                  name="bankDetails.accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("accountHolderName")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom du titulaire du compte" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankDetails.iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: FR76 1234 5678 9012 3456 7890 123" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankDetails.bic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BIC/SWIFT</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="BNPAFRPP" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Détails PayPal */}
            {selectedMethod === "paypal" && (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  PayPal
                </h4>
                
                <FormField
                  control={form.control}
                  name="bankDetails.accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("paypalEmail")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Adresse email" />
                      </FormControl>
                      <FormDescription>
                        {t("paypalEmailDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Description optionnelle */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("description")} ({t("optional")})</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("descriptionPlaceholder")}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Avertissement sur les délais */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t("processingTimeWarning")}
              </AlertDescription>
            </Alert>

            {/* Validation finale et résumé */}
            {form.watch("amount") > 0 && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {t("withdrawalSummary")}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t("amount")}:</span>
                    <span className="font-medium">
                      {formatCurrency(form.watch("amount"), currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("method")}:</span>
                    <span className="font-medium">
                      {selectedMethod === "bank_transfer" ? t("bankTransfer") : "PayPal"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("fees")}:</span>
                    <span className="font-medium text-green-600">
                      {t("free")}
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>{t("totalToReceive")}:</span>
                    <span>{formatCurrency(form.watch("amount"), currency)}</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={isSubmitting || !form.formState.isValid || form.watch("amount") < minimumAmount}
          className="flex-1"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("processing")}
            </div>
          ) : (
            t("requestWithdrawal")
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
