"use client";

import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Loader2,
  AlertCircle,
  ArrowLeftCircle,
  CreditCard,
  Check,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Wallet,
  Zap,
  Bank,
  Info,
  RotateCw,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/document-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/hooks/payment/use-wallet";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schéma de validation pour le formulaire de retrait
const withdrawalSchema = z.object({ amount: z
    .string()
    .min(1, { message: "Le montant est requis"  })
    .refine((val) => !isNaN(parseFloat(val)), {
      message: "Le montant doit être un nombre valide",
    })
    .refine((val) => parseFloat(val) > 0, {
      message: "Le montant doit être supérieur à 0",
    }),
  bankDetails: z.object({ accountName: z
      .string()
      .min(1, { message: "Le nom du titulaire du compte est requis"  }),
    iban: z
      .string()
      .min(15, { message: "IBAN invalide" })
      .max(34, { message: "IBAN invalide" }),
    bic: z
      .string()
      .min(8, { message: "BIC/SWIFT invalide" })
      .max(11, { message: "BIC/SWIFT invalide" }),
  }),
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
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("wallet");
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'bank_transfer' | 'paypal'>('bank_transfer');

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: "",
      bankDetails: savedBankDetails || {
        accountName: "",
        iban: "",
        bic: "",
      },
      description: "",
    },
  });

  // Simulation du traitement pour le mode démo
  const simulateProcessing = async () => {
    if (!isDemo) return;

    setStatus("processing");
    setProcessingStep(t("validatingAmount"));
    setProgress(10);

    await new Promise((resolve) => setTimeout(resolve, 800));
    setProgress(30);
    setProcessingStep(t("checkingAccount"));

    await new Promise((resolve) => setTimeout(resolve, 1000));
    setProgress(60);
    setProcessingStep(t("preparingTransaction"));

    await new Promise((resolve) => setTimeout(resolve, 1200));
    setProgress(90);
    setProcessingStep(t("finalizingWithdrawal"));

    await new Promise((resolve) => setTimeout(resolve, 800));
    setProgress(100);
  };

  const handleSubmit = async (data: WithdrawalFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Appel API réel pour traiter le retrait
      const result = await api.wallet.requestWithdrawal.mutate({
        amount: data.amount,
        method: selectedMethod,
        bankDetails: selectedMethod === 'bank_transfer' ? {
          iban: data.bankDetails.iban,
          bic: data.bankDetails.bic,
          accountHolderName: data.bankDetails.accountName,
        } : undefined,
        paypalEmail: selectedMethod === 'paypal' ? data.bankDetails.accountName : undefined,
      });

      if (result.success) {
        toast({ title: t("withdrawalRequested"),
          description: t("withdrawalProcessingMessage"),
         });
        onSubmit(data);
        form.reset();
      } else {
        toast({ variant: "destructive",
          title: t("error"),
          description: result.error || t("withdrawalFailed"),
         });
      }
    } catch (error) {
      toast({ variant: "destructive",
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
    form.setValue("amount", walletBalance.toString());
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
              render={({ field  }) => (
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
                        min="10"
                        max={walletBalance}
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t("availableBalance")}: {formatCurrency(walletBalance, "EUR")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Méthode de retrait */}
            <FormField
              control={form.control}
              name="method"
              render={({ field  }) => (
                <FormItem>
                  <FormLabel>{t("withdrawalMethod")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium">{t("bankDetails")}</h4>
                
                <FormField
                  control={form.control}
                  name="bankDetails.iban"
                  render={({ field  }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="FR76 1234 5678 9012 3456 7890 123" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankDetails.bic"
                  render={({ field  }) => (
                    <FormItem>
                      <FormLabel>BIC/SWIFT</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="BNPAFRPP" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankDetails.accountName"
                  render={({ field  }) => (
                    <FormItem>
                      <FormLabel>{t("accountHolderName")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("fullName")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Email PayPal */}
            {selectedMethod === "paypal" && (
              <FormField
                control={form.control}
                name="bankDetails.accountName"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("paypalEmail")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4">
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
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  t("requestWithdrawal")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
