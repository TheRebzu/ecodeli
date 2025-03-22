"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

import { registerClient, registerMerchant, registerCourier, registerProvider } from "@/actions/auth.action";

// Validation pour les mots de passe
const passwordsMatch = (data: { password: string; confirmPassword: string }) => 
  data.password === data.confirmPassword || "Les mots de passe ne correspondent pas";

// Schéma pour les clients
const clientSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  subscriptionPlan: z.enum(["FREE", "STARTER", "PREMIUM"]).default("FREE"),
}).refine(passwordsMatch, {
  path: ["confirmPassword"],
});

// Schéma pour les commerçants
const merchantSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  companyName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  siret: z.string().min(14, "Le SIRET doit contenir 14 chiffres").max(14),
}).refine(passwordsMatch, {
  path: ["confirmPassword"],
});

// Schéma pour les livreurs
const courierSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  vehicleType: z.string().min(1, "Le type de véhicule est requis"),
  licenseNumber: z.string().optional(),
  licensePlate: z.string().optional(),
}).refine(passwordsMatch, {
  path: ["confirmPassword"],
});

// Schéma pour les prestataires
const providerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  serviceTypes: z.array(z.string()).min(1, "Veuillez sélectionner au moins un type de service"),
  qualifications: z.string().optional(),
  certifications: z.string().optional(),
}).refine(passwordsMatch, {
  path: ["confirmPassword"],
});

type UserRole = "CLIENT" | "MERCHANT" | "COURIER" | "PROVIDER";

type ClientFormValues = z.infer<typeof clientSchema>;
type MerchantFormValues = z.infer<typeof merchantSchema>;
type CourierFormValues = z.infer<typeof courierSchema>;
type ProviderFormValues = z.infer<typeof providerSchema>;

export function RegisterForm({ defaultRole = "CLIENT", defaultPlan = "FREE" }: { defaultRole?: UserRole; defaultPlan?: string }) {
  const [activeRole, setActiveRole] = useState<UserRole>(defaultRole);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Formulaire pour client
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      subscriptionPlan: defaultPlan as "FREE" | "STARTER" | "PREMIUM",
    },
  });

  // Formulaire pour commerçant
  const merchantForm = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      companyName: "",
      siret: "",
    },
  });

  // Formulaire pour livreur
  const courierForm = useForm<CourierFormValues>({
    resolver: zodResolver(courierSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      vehicleType: "",
      licenseNumber: "",
      licensePlate: "",
    },
  });

  // Formulaire pour prestataire
  const providerForm = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      serviceTypes: [],
      qualifications: "",
      certifications: "",
    },
  });

  // Gestion des soumissions de formulaires
  const handleClientSubmit = async (data: ClientFormValues) => {
    setIsLoading(true);
    try {
      const { name, email, password } = data;
      
      const response = await registerClient({
        name,
        email,
        password,
        subscriptionPlan: "FREE",
      });
      
      if (response.success) {
        toast({
          title: "Inscription réussie",
          description: "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
        });
        router.push("/login");
      } else {
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: response.error || "Une erreur est survenue lors de l'inscription.",
        });
      }
    } catch (error: unknown) {
      console.error("Erreur d'inscription client:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerchantSubmit = async (data: MerchantFormValues) => {
    setIsLoading(true);
    try {
      const { name, email, password, siret, address, companyName } = data;
      
      const response = await registerMerchant({
        name,
        email,
        password,
        siret,
        address,
        companyName,
      });
      
      if (response.success) {
        toast({
          title: "Inscription réussie",
          description: "Votre compte commerçant a été créé avec succès. Il est en attente de validation par notre équipe.",
        });
        router.push("/login");
      } else {
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: response.error || "Une erreur est survenue lors de l'inscription.",
        });
      }
    } catch (error: unknown) {
      console.error("Erreur d'inscription marchand:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourierSubmit = async (data: CourierFormValues) => {
    setIsLoading(true);
    try {
      const { name, email, password, vehicleType, address, phone } = data;
      
      const response = await registerCourier({
        name,
        email,
        password,
        vehicleType,
        address,
        phone,
      });
      
      if (response.success) {
        toast({
          title: "Inscription réussie",
          description: "Votre compte livreur a été créé avec succès. Il est en attente de validation par notre équipe.",
        });
        router.push("/login");
      } else {
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: response.error || "Une erreur est survenue lors de l'inscription.",
        });
      }
    } catch (error: unknown) {
      console.error("Erreur d'inscription livreur:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSubmit = async (data: ProviderFormValues) => {
    setIsLoading(true);
    try {
      const { name, email, password, serviceTypes, address, phone } = data;
      
      const response = await registerProvider({
        name,
        email,
        password,
        serviceTypes,
        address,
        phone,
      });
      
      if (response.success) {
        toast({
          title: "Inscription réussie",
          description: "Votre compte prestataire a été créé avec succès. Il est en attente de validation par notre équipe.",
        });
        router.push("/login");
      } else {
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: response.error || "Une erreur est survenue lors de l'inscription.",
        });
      }
    } catch (error: unknown) {
      console.error("Erreur d'inscription fournisseur:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Rendu du formulaire approprié en fonction du rôle
  const renderForm = () => {
    switch (activeRole) {
      case "CLIENT":
        return renderClientForm();
      case "MERCHANT":
        return renderMerchantForm();
      case "COURIER":
        return renderCourierForm();
      case "PROVIDER":
        return renderProviderForm();
      default:
        return renderClientForm();
    }
  };

  // Rendu des champs communs pour tous les formulaires
  const renderCommonFields = (form: typeof clientForm | typeof merchantForm | typeof courierForm | typeof providerForm) => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nom complet</FormLabel>
            <FormControl>
              <Input placeholder="Jean Dupont" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="jean.dupont@exemple.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmer le mot de passe</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="06 12 34 56 78" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="123 rue de Paris" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ville</FormLabel>
              <FormControl>
                <Input placeholder="Paris" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code postal</FormLabel>
              <FormControl>
                <Input placeholder="75001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem className="col-span-2 sm:col-span-1">
              <FormLabel>Pays</FormLabel>
              <FormControl>
                <Input placeholder="France" defaultValue="France" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  // Formulaire client
  const renderClientForm = () => (
    <Form {...clientForm}>
      <form onSubmit={clientForm.handleSubmit(handleClientSubmit)} className="space-y-6">
        {renderCommonFields(clientForm)}

        <FormField
          control={clientForm.control}
          name="subscriptionPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formule d&apos;abonnement</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une formule" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="FREE">Free - Gratuit pour toujours</SelectItem>
                  <SelectItem value="STARTER">Starter - 9,90€/mois</SelectItem>
                  <SelectItem value="PREMIUM">Premium - 19,99€/mois</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inscription en cours...
            </>
          ) : (
            "S'inscrire en tant que client"
          )}
        </Button>
      </form>
    </Form>
  );

  // Formulaire commerçant
  const renderMerchantForm = () => (
    <Form {...merchantForm}>
      <form onSubmit={merchantForm.handleSubmit(handleMerchantSubmit)} className="space-y-6">
        {renderCommonFields(merchantForm)}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={merchantForm.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de l&apos;entreprise</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="Ma Société SAS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={merchantForm.control}
            name="siret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro SIRET</FormLabel>
                <FormControl>
                  <Input
                    disabled={isLoading}
                    placeholder="12345678901234"
                    maxLength={14}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inscription en cours...
            </>
          ) : (
            "S'inscrire en tant que commerçant"
          )}
        </Button>
      </form>
    </Form>
  );

  // Formulaire livreur
  const renderCourierForm = () => (
    <Form {...courierForm}>
      <form onSubmit={courierForm.handleSubmit(handleCourierSubmit)} className="space-y-6">
        {renderCommonFields(courierForm)}

        <FormField
          control={courierForm.control}
          name="vehicleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de véhicule</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type de véhicule" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BIKE">Vélo</SelectItem>
                  <SelectItem value="SCOOTER">Scooter / Moto</SelectItem>
                  <SelectItem value="CAR">Voiture</SelectItem>
                  <SelectItem value="VAN">Camionnette</SelectItem>
                  <SelectItem value="TRUCK">Camion</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={courierForm.control}
            name="licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de permis (optionnel)</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={courierForm.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plaque d&apos;immatriculation (optionnel)</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="AA-123-BB" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inscription en cours...
            </>
          ) : (
            "S'inscrire en tant que livreur"
          )}
        </Button>
      </form>
    </Form>
  );

  // Formulaire prestataire
  const renderProviderForm = () => (
    <Form {...providerForm}>
      <form onSubmit={providerForm.handleSubmit(handleProviderSubmit)} className="space-y-6">
        {renderCommonFields(providerForm)}

        <FormField
          control={providerForm.control}
          name="serviceTypes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Types de services proposés</FormLabel>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { value: "PERSONAL_TRANSPORT", label: "Transport de personnes" },
                    { value: "AIRPORT_TRANSFER", label: "Transfert aéroport" },
                    { value: "SHOPPING", label: "Courses" },
                    { value: "FOREIGN_PURCHASE", label: "Achats à l'étranger" },
                    { value: "PET_SITTING", label: "Garde d'animaux" },
                    { value: "HOUSEKEEPING", label: "Ménage" },
                    { value: "GARDENING", label: "Jardinage" },
                    { value: "OTHER", label: "Autre" },
                  ].map((service) => (
                    <div key={service.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={service.value}
                        value={service.value}
                        disabled={isLoading}
                        checked={field.value?.includes(service.value)}
                        onChange={(e) => {
                          const value = e.target.value;
                          const checked = e.target.checked;
                          
                          if (checked) {
                            field.onChange([...(field.value || []), value]);
                          } else {
                            field.onChange(
                              field.value?.filter((val: string) => val !== value) || []
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                      <label htmlFor={service.value} className="text-sm">
                        {service.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={providerForm.control}
            name="qualifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qualifications (optionnel)</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={providerForm.control}
            name="certifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certifications (optionnel)</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inscription en cours...
            </>
          ) : (
            "S'inscrire en tant que prestataire"
          )}
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeRole} onValueChange={(value) => setActiveRole(value as UserRole)}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="CLIENT">Client</TabsTrigger>
          <TabsTrigger value="MERCHANT">Commerçant</TabsTrigger>
          <TabsTrigger value="COURIER">Livreur</TabsTrigger>
          <TabsTrigger value="PROVIDER">Prestataire</TabsTrigger>
        </TabsList>
        <div className="mt-6">{renderForm()}</div>
      </Tabs>
    </div>
  );
}
