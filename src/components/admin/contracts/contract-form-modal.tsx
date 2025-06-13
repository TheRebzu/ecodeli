"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ContractFormData } from "@/hooks/admin/use-admin-contracts";

const contractFormSchema = z.object({
  merchantId: z.string().min(1, "Commerçant requis"),
  templateId: z.string().optional(),
  title: z.string().min(1, "Titre requis").max(100, "Titre trop long"),
  content: z
    .string()
    .min(10, "Contenu trop court")
    .max(10000, "Contenu trop long"),
  status: z.enum([
    "DRAFT",
    "PENDING_SIGNATURE",
    "ACTIVE",
    "SUSPENDED",
    "TERMINATED",
    "EXPIRED",
    "CANCELLED",
  ]),
  type: z.enum(["STANDARD", "PREMIUM", "PARTNER", "TRIAL", "CUSTOM"]),
  monthlyFee: z.number().min(0).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  minimumVolume: z.number().min(0).optional(),
  merchantCategory: z.string().optional(),
  deliveryZone: z.string().optional(),
  maxDeliveryRadius: z.number().min(0).optional(),
  effectiveDate: z.date().optional(),
  expiresAt: z.date().optional(),
  autoRenewal: z.boolean().default(false),
  renewalNotice: z.number().min(0).optional(),
  insuranceRequired: z.boolean().default(false),
  insuranceAmount: z.number().min(0).optional(),
  securityDeposit: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type ContractFormSchema = z.infer<typeof contractFormSchema>;

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => void;
  contract?: any; // Contract à éditer (optionnel)
  merchants: Array<{
    id: string;
    companyName: string;
    businessType: string;
    user: {
      email: string;
      name: string;
    };
  }>;
  isLoading: boolean;
}

const CONTRACT_STATUSES = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "PENDING_SIGNATURE", label: "En attente de signature" },
  { value: "ACTIVE", label: "Actif" },
  { value: "SUSPENDED", label: "Suspendu" },
  { value: "TERMINATED", label: "Résilié" },
  { value: "EXPIRED", label: "Expiré" },
  { value: "CANCELLED", label: "Annulé" },
];

const CONTRACT_TYPES = [
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
  { value: "PARTNER", label: "Partenaire" },
  { value: "TRIAL", label: "Essai" },
  { value: "CUSTOM", label: "Personnalisé" },
];

const MERCHANT_CATEGORIES = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "GROCERY", label: "Épicerie" },
  { value: "PHARMACY", label: "Pharmacie" },
  { value: "FASHION", label: "Mode" },
  { value: "ELECTRONICS", label: "Électronique" },
  { value: "BOOKS", label: "Librairie" },
  { value: "BEAUTY", label: "Beauté" },
  { value: "SPORTS", label: "Sport" },
  { value: "OTHER", label: "Autre" },
];

export function ContractFormModal({
  isOpen,
  onClose,
  onSubmit,
  contract,
  merchants,
  isLoading,
}: ContractFormModalProps) {
  const [selectedMerchant, setSelectedMerchant] = useState<string>("");

  const form = useForm<ContractFormSchema>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      merchantId: "",
      templateId: "",
      title: "",
      content: "",
      status: "DRAFT",
      type: "STANDARD",
      monthlyFee: 0,
      commissionRate: 0,
      minimumVolume: 0,
      merchantCategory: "",
      deliveryZone: "",
      maxDeliveryRadius: 0,
      autoRenewal: false,
      renewalNotice: 30,
      insuranceRequired: false,
      insuranceAmount: 0,
      securityDeposit: 0,
      notes: "",
    },
  });

  // Pré-remplir le formulaire si on édite un contrat existant
  useEffect(() => {
    if (contract && isOpen) {
      form.reset({
        merchantId: contract.merchant?.id || "",
        templateId: contract.template?.id || "",
        title: contract.title || "",
        content: contract.content || "",
        status: contract.status || "DRAFT",
        type: contract.type || "STANDARD",
        monthlyFee: contract.monthlyFee || 0,
        commissionRate: contract.commissionRate || 0,
        minimumVolume: contract.minimumVolume || 0,
        merchantCategory: contract.merchantCategory || "",
        deliveryZone: contract.deliveryZone || "",
        maxDeliveryRadius: contract.maxDeliveryRadius || 0,
        effectiveDate: contract.effectiveDate
          ? new Date(contract.effectiveDate)
          : undefined,
        expiresAt: contract.expiresAt
          ? new Date(contract.expiresAt)
          : undefined,
        autoRenewal: contract.autoRenewal || false,
        renewalNotice: contract.renewalNotice || 30,
        insuranceRequired: contract.insuranceRequired || false,
        insuranceAmount: contract.insuranceAmount || 0,
        securityDeposit: contract.securityDeposit || 0,
        notes: contract.notes || "",
      });
      setSelectedMerchant(contract.merchant?.id || "");
    } else if (!contract && isOpen) {
      // Reset pour nouveau contrat
      form.reset();
      setSelectedMerchant("");
    }
  }, [contract, isOpen, form]);

  const handleSubmit = (data: ContractFormSchema) => {
    onSubmit(data as ContractFormData);
  };

  const handleClose = () => {
    form.reset();
    setSelectedMerchant("");
    onClose();
  };

  const isEditing = !!contract;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditing ? "Modifier le contrat" : "Nouveau contrat"}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Section 1: Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="merchantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commerçant *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un commerçant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {merchants.map((merchant) => (
                          <SelectItem key={merchant.id} value={merchant.id}>
                            <div className="flex flex-col">
                              <span>{merchant.companyName}</span>
                              <span className="text-xs text-muted-foreground">
                                {merchant.businessType} • {merchant.user.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre du contrat *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Contrat de partenariat Restaurant ABC"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de contrat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTRACT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTRACT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Conditions financières */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Conditions financières</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frais mensuels (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taux de commission (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          max="100"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              parseFloat(e.target.value) / 100 || 0,
                            )
                          }
                          value={
                            field.value ? (field.value * 100).toFixed(2) : ""
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Pourcentage prélevé sur chaque transaction
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="securityDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dépôt de garantie (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 3: Dates et durée */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dates et durée</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date d'entrée en vigueur</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: fr })
                              ) : (
                                <span>Sélectionner une date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date d'expiration</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: fr })
                              ) : (
                                <span>Sélectionner une date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="autoRenewal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Renouvellement automatique
                        </FormLabel>
                        <FormDescription>
                          Le contrat sera renouvelé automatiquement à
                          l'expiration
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("autoRenewal") && (
                  <FormField
                    control={form.control}
                    name="renewalNotice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Préavis de renouvellement (jours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 30)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Nombre de jours avant l'expiration pour notifier le
                          renouvellement
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Section 4: Contenu du contrat */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu du contrat *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Saisissez le contenu détaillé du contrat..."
                      className="min-h-32"
                    />
                  </FormControl>
                  <FormDescription>
                    Conditions générales, clauses spéciales, obligations des
                    parties, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section 5: Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes internes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Notes à usage interne (non visibles par le commerçant)..."
                      className="min-h-20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Mettre à jour" : "Créer le contrat"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
