"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  registerClient,
  registerMerchant,
  registerCourier,
  registerProvider
} from "@/actions/auth.action";

// Schéma de base pour tous les utilisateurs
const baseUserSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Schéma pour les coordonnées
const contactInfoSchema = z.object({
  phone: z.string().optional(),
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  city: z.string().min(2, "La ville doit contenir au moins 2 caractères"),
  postalCode: z.string().min(5, "Le code postal doit contenir au moins 5 caractères"),
  country: z.string().min(2, "Le pays doit contenir au moins 2 caractères").default("France"),
});

// Schémas spécifiques pour chaque type d'utilisateur
const clientSpecificSchema = z.object({
  subscriptionPlan: z.enum(["FREE", "STARTER", "PREMIUM"]).default("FREE"),
});

const merchantSpecificSchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  siret: z.string().min(14, "Le SIRET doit contenir 14 chiffres").max(14),
});

const courierSpecificSchema = z.object({
  vehicleType: z.enum(["BIKE", "SCOOTER", "CAR", "VAN", "TRUCK"]),
  licenseNumber: z.string().optional(),
  licensePlate: z.string().optional(),
});

const providerSpecificSchema = z.object({
  serviceTypes: z.array(z.string()).min(1, "Veuillez sélectionner au moins un type de service"),
  qualifications: z.string().optional(),
  certifications: z.string().optional(),
});

type UserRole = "CLIENT" | "MERCHANT" | "COURIER" | "PROVIDER";
type FormStep = "account" | "contact" | "specific" | "review";

type MultiStepSignupFormProps = {
  defaultRole?: UserRole;
  className?: string;
};

export function MultiStepSignupForm({
  defaultRole = "CLIENT",
  className,
}: MultiStepSignupFormProps) {
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [step, setStep] = useState<FormStep>("account");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // États pour stocker les données entre les étapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accountData, setAccountData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contactData, setContactData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [specificData, setSpecificData] = useState<any>(null);

  // Formulaire pour l'étape "compte"
  const accountForm = useForm<z.infer<typeof baseUserSchema>>({
    resolver: zodResolver(baseUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Formulaire pour l'étape "contact"
  const contactForm = useForm<z.infer<typeof contactInfoSchema>>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "France",
    },
  });

  // Formulaires spécifiques en fonction du rôle
  const clientSpecificForm = useForm<z.infer<typeof clientSpecificSchema>>({
    resolver: zodResolver(clientSpecificSchema),
    defaultValues: {
      subscriptionPlan: "FREE",
    },
  });

  const merchantSpecificForm = useForm<z.infer<typeof merchantSpecificSchema>>({
    resolver: zodResolver(merchantSpecificSchema),
    defaultValues: {
      companyName: "",
      siret: "",
    },
  });

  const courierSpecificForm = useForm<z.infer<typeof courierSpecificSchema>>({
    resolver: zodResolver(courierSpecificSchema),
    defaultValues: {
      vehicleType: "BIKE",
      licenseNumber: "",
      licensePlate: "",
    },
  });

  const providerSpecificForm = useForm<z.infer<typeof providerSpecificSchema>>({
    resolver: zodResolver(providerSpecificSchema),
    defaultValues: {
      serviceTypes: [],
      qualifications: "",
      certifications: "",
    },
  });

  // Pourcentage de progression
  const getProgressPercentage = () => {
    switch (step) {
      case "account":
        return 25;
      case "contact":
        return 50;
      case "specific":
        return 75;
      case "review":
        return 100;
      default:
        return 0;
    }
  };

  // Gestion des étapes du formulaire
  const handleAccountSubmit = (data: z.infer<typeof baseUserSchema>) => {
    setAccountData(data);
    setStep("contact");
  };

  const handleContactSubmit = (data: z.infer<typeof contactInfoSchema>) => {
    setContactData(data);
    setStep("specific");
  };

  const handleSpecificSubmit = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
  ) => {
    setSpecificData(data);
    setStep("review");
  };

  // Labels spécifiques pour chaque rôle
  const roleLabels = {
    CLIENT: "client",
    MERCHANT: "commerçant",
    COURIER: "livreur",
    PROVIDER: "prestataire",
  };

  const calculateStep = () => {
    const steps = ["account", "contact", "specific", "review"];
    return steps.indexOf(step) + 1;
  };

  // Soumission finale du formulaire
  const handleFinalSubmit = async () => {
    setIsLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...accountDataWithoutConfirm } = accountData;
      const formData = {
        ...accountDataWithoutConfirm,
        ...contactData,
        ...specificData,
      };

      let response;

      switch (role) {
        case "CLIENT":
          response = await registerClient({
            ...formData,
            subscriptionPlan: formData.subscriptionPlan || "FREE",
          });
          break;
        case "MERCHANT":
          response = await registerMerchant(formData);
          break;
        case "COURIER":
          response = await registerCourier(formData);
          break;
        case "PROVIDER":
          response = await registerProvider(formData);
          break;
      }

      if (response.success) {
        toast({
          title: "Inscription réussie",
          description: 
            role === "CLIENT" 
              ? "Votre compte a été créé avec succès."
              : "Votre compte a été créé avec succès. Il est en attente de validation par notre équipe.",
        });
        router.push("/login");
      } else {
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: response.error || "Une erreur est survenue lors de l'inscription.",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: "Une erreur inattendue s'est produite lors de l'inscription.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour naviguer vers l'étape précédente
  const goToPreviousStep = () => {
    switch (step) {
      case "contact":
        setStep("account");
        break;
      case "specific":
        setStep("contact");
        break;
      case "review":
        setStep("specific");
        break;
    }
  };

  // Rendu du formulaire en fonction de l'étape
  const renderStepForm = () => {
    switch (step) {
      case "account":
        return (
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center justify-center bg-primary/10 text-primary rounded-full w-6 h-6 text-sm font-medium">1</span>
                  <h3 className="text-lg font-medium">Créez votre compte</h3>
                </div>
                
                <Tabs 
                  defaultValue={role} 
                  onValueChange={(value) => setRole(value as UserRole)}
                  className="w-full my-4"
                >
                  <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
                    <TabsTrigger value="CLIENT">Client</TabsTrigger>
                    <TabsTrigger value="MERCHANT">Commerçant</TabsTrigger>
                    <TabsTrigger value="COURIER">Livreur</TabsTrigger>
                    <TabsTrigger value="PROVIDER">Prestataire</TabsTrigger>
                  </TabsList>
                </Tabs>

                <FormField
                  control={accountForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={accountForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="jean.dupont@exemple.com" 
                          autoComplete="email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={accountForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="********" 
                            autoComplete="new-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accountForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer le mot de passe</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="********" 
                            autoComplete="new-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit">
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );

      case "contact":
        return (
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(handleContactSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center justify-center bg-primary/10 text-primary rounded-full w-6 h-6 text-sm font-medium">2</span>
                  <h3 className="text-lg font-medium">Renseignez vos coordonnées</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={contactForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="06 12 34 56 78" 
                            autoComplete="tel"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={contactForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123 rue de Paris" 
                            autoComplete="street-address"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={contactForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Paris" 
                            autoComplete="address-level2"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={contactForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="75001" 
                            autoComplete="postal-code"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={contactForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="France" 
                            autoComplete="country-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goToPreviousStep}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
                <Button type="submit">
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );

      case "specific":
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center bg-primary/10 text-primary rounded-full w-6 h-6 text-sm font-medium">3</span>
              <h3 className="text-lg font-medium">
                Informations spécifiques ({roleLabels[role]})
              </h3>
            </div>

            {role === "CLIENT" && (
              <Form {...clientSpecificForm}>
                <form onSubmit={clientSpecificForm.handleSubmit(handleSpecificSubmit)} className="space-y-6">
                  <FormField
                    control={clientSpecificForm.control}
                    name="subscriptionPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Formule d&apos;abonnement</FormLabel>
                        <Select
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

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={goToPreviousStep}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                    <Button type="submit">
                      Vérifier
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {role === "MERCHANT" && (
              <Form {...merchantSpecificForm}>
                <form onSubmit={merchantSpecificForm.handleSubmit(handleSpecificSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={merchantSpecificForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de l&apos;entreprise</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ma Société SAS" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={merchantSpecificForm.control}
                      name="siret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro SIRET</FormLabel>
                          <FormControl>
                            <Input
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

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={goToPreviousStep}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                    <Button type="submit">
                      Vérifier
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {role === "COURIER" && (
              <Form {...courierSpecificForm}>
                <form onSubmit={courierSpecificForm.handleSubmit(handleSpecificSubmit)} className="space-y-6">
                  <FormField
                    control={courierSpecificForm.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de véhicule</FormLabel>
                        <Select
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
                      control={courierSpecificForm.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de permis (optionnel)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={courierSpecificForm.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plaque d&apos;immatriculation (optionnel)</FormLabel>
                          <FormControl>
                            <Input placeholder="AA-123-BB" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={goToPreviousStep}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                    <Button type="submit">
                      Vérifier
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {role === "PROVIDER" && (
              <Form {...providerSpecificForm}>
                <form onSubmit={providerSpecificForm.handleSubmit(handleSpecificSubmit)} className="space-y-6">
                  <FormField
                    control={providerSpecificForm.control}
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
                      control={providerSpecificForm.control}
                      name="qualifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qualifications (optionnel)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={providerSpecificForm.control}
                      name="certifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Certifications (optionnel)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={goToPreviousStep}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                    <Button type="submit">
                      Vérifier
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center bg-primary/10 text-primary rounded-full w-6 h-6 text-sm font-medium">4</span>
              <h3 className="text-lg font-medium">Vérifier vos informations</h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <h4 className="text-sm font-medium mb-2">Informations du compte</h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Nom</dt>
                    <dd>{accountData?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>{accountData?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type de compte</dt>
                    <dd>{roleLabels[role]}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h4 className="text-sm font-medium mb-2">Coordonnées</h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Téléphone</dt>
                    <dd>{contactData?.phone || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Adresse</dt>
                    <dd>{contactData?.address}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ville</dt>
                    <dd>{contactData?.city}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Code postal</dt>
                    <dd>{contactData?.postalCode}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Pays</dt>
                    <dd>{contactData?.country}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h4 className="text-sm font-medium mb-2">Informations spécifiques</h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {role === "CLIENT" && (
                    <div>
                      <dt className="text-muted-foreground">Formule d&apos;abonnement</dt>
                      <dd>{
                        specificData?.subscriptionPlan === "FREE" 
                          ? "Free - Gratuit pour toujours" 
                          : specificData?.subscriptionPlan === "STARTER" 
                            ? "Starter - 9,90€/mois" 
                            : "Premium - 19,99€/mois"
                      }</dd>
                    </div>
                  )}

                  {role === "MERCHANT" && (
                    <>
                      <div>
                        <dt className="text-muted-foreground">Nom de l&apos;entreprise</dt>
                        <dd>{specificData?.companyName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">SIRET</dt>
                        <dd>{specificData?.siret}</dd>
                      </div>
                    </>
                  )}

                  {role === "COURIER" && (
                    <>
                      <div>
                        <dt className="text-muted-foreground">Type de véhicule</dt>
                        <dd>{
                          specificData?.vehicleType === "BIKE" 
                            ? "Vélo" 
                            : specificData?.vehicleType === "SCOOTER" 
                              ? "Scooter / Moto" 
                              : specificData?.vehicleType === "CAR" 
                                ? "Voiture" 
                                : specificData?.vehicleType === "VAN" 
                                  ? "Camionnette" 
                                  : "Camion"
                        }</dd>
                      </div>
                      {specificData?.licenseNumber && (
                        <div>
                          <dt className="text-muted-foreground">Numéro de permis</dt>
                          <dd>{specificData.licenseNumber}</dd>
                        </div>
                      )}
                      {specificData?.licensePlate && (
                        <div>
                          <dt className="text-muted-foreground">Plaque d&apos;immatriculation</dt>
                          <dd>{specificData.licensePlate}</dd>
                        </div>
                      )}
                    </>
                  )}

                  {role === "PROVIDER" && (
                    <>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Services proposés</dt>
                        <dd className="flex flex-wrap gap-1 mt-1">
                          {specificData?.serviceTypes?.map((type: string) => (
                            <span 
                              key={type} 
                              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                            >
                              {
                                type === "PERSONAL_TRANSPORT" 
                                  ? "Transport de personnes" 
                                  : type === "AIRPORT_TRANSFER" 
                                    ? "Transfert aéroport" 
                                    : type === "SHOPPING" 
                                      ? "Courses" 
                                      : type === "FOREIGN_PURCHASE" 
                                        ? "Achats à l'étranger" 
                                        : type === "PET_SITTING" 
                                          ? "Garde d'animaux" 
                                          : type === "HOUSEKEEPING" 
                                            ? "Ménage" 
                                            : type === "GARDENING" 
                                              ? "Jardinage" 
                                              : "Autre"
                              }
                            </span>
                          ))}
                        </dd>
                      </div>
                      {specificData?.qualifications && (
                        <div>
                          <dt className="text-muted-foreground">Qualifications</dt>
                          <dd>{specificData.qualifications}</dd>
                        </div>
                      )}
                      {specificData?.certifications && (
                        <div>
                          <dt className="text-muted-foreground">Certifications</dt>
                          <dd>{specificData.certifications}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </div>
            </div>

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={goToPreviousStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button 
                type="button"
                onClick={handleFinalSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inscription en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finaliser l&apos;inscription
                  </>
                )}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Création de compte</h2>
          <span className="text-sm text-muted-foreground">
            Étape {calculateStep()} sur 4
          </span>
        </div>
        <Progress value={getProgressPercentage()} className="h-2" />
      </div>
      
      {renderStepForm()}
    </div>
  );
} 