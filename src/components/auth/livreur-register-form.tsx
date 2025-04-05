"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { 
  RegisterFormData, 
  registerSchema,
  UserRoleEnum,
  VehicleTypeEnum,
  DaysOfWeekEnum
} from "@/lib/validations/auth.schema";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/shared/icons";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/shared/file-upload";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Liste des types de véhicules
const VEHICLE_TYPES = [
  { value: VehicleTypeEnum.enum.VELO, label: "Vélo" },
  { value: VehicleTypeEnum.enum.SCOOTER, label: "Scooter" },
  { value: VehicleTypeEnum.enum.VOITURE, label: "Voiture" },
  { value: VehicleTypeEnum.enum.CAMIONNETTE, label: "Camionnette" },
  { value: VehicleTypeEnum.enum.CAMION, label: "Camion" },
  { value: VehicleTypeEnum.enum.TRANSPORT_PUBLIC, label: "Transport public" },
  { value: VehicleTypeEnum.enum.MARCHE, label: "Marche" },
];

// Liste des jours de la semaine
const DAYS_OF_WEEK = [
  { value: DaysOfWeekEnum.enum.LUNDI, label: "Lundi" },
  { value: DaysOfWeekEnum.enum.MARDI, label: "Mardi" },
  { value: DaysOfWeekEnum.enum.MERCREDI, label: "Mercredi" },
  { value: DaysOfWeekEnum.enum.JEUDI, label: "Jeudi" },
  { value: DaysOfWeekEnum.enum.VENDREDI, label: "Vendredi" },
  { value: DaysOfWeekEnum.enum.SAMEDI, label: "Samedi" },
  { value: DaysOfWeekEnum.enum.DIMANCHE, label: "Dimanche" },
];

interface LivreurRegisterFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LivreurRegisterForm({ className, ...props }: LivreurRegisterFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [savedFormData, setSavedFormData] = useState<Partial<RegisterFormData>>({});

  // Initialiser le formulaire avec React Hook Form et Zod
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: UserRoleEnum.enum.LIVREUR,
      termsAccepted: false,
      vehicleType: undefined,
      licenseNumber: "",
      licensePlate: "",
      carryCapacity: "",
      deliveryZones: "",
      documents: [],
      ...savedFormData,
    },
    mode: "onChange",
  });

  // Charger les données sauvegardées du formulaire
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('livreurRegisterFormProgress');
      if (savedProgress) {
        const parsedData = JSON.parse(savedProgress);
        setSavedFormData(parsedData);
        form.reset({
          ...form.getValues(),
          ...parsedData
        });
        
        // Restaurer les documents
        if (parsedData.documents && Array.isArray(parsedData.documents)) {
          setUploadedDocuments(parsedData.documents);
        }
      }
    } catch (error) {
      console.error('Error loading saved form progress', error);
    }
  }, [form]);

  // Sauvegarder la progression du formulaire
  const saveFormProgress = () => {
    try {
      const currentValues = form.getValues();
      currentValues.documents = uploadedDocuments;
      localStorage.setItem('livreurRegisterFormProgress', JSON.stringify(currentValues));
    } catch (error) {
      console.error('Error saving form progress', error);
    }
  };

  // Gérer la soumission du formulaire
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      // Ajouter les documents
      data.documents = uploadedDocuments;
      
      // Utiliser le hook useAuth pour l'inscription
      const success = await signUp(data);
      
      if (success) {
        // Supprimer les données sauvegardées après inscription réussie
        localStorage.removeItem('livreurRegisterFormProgress');
        
        // Redirection vers la page de vérification
        router.push("/verification-pending");
        toast.success("Inscription réussie ! Votre compte est en attente de validation.");
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de l'inscription. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer le téléchargement des documents
  const handleDocumentUpload = (url: string) => {
    setUploadedDocuments((prev) => {
      const newDocs = [...prev, url];
      saveFormProgress();
      return newDocs;
    });
  };

  // Supprimer un document
  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => {
      const newDocs = prev.filter((_, i) => i !== index);
      setTimeout(() => saveFormProgress(), 0);
      return newDocs;
    });
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/register")}
          className="mr-2"
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-xl font-semibold">Inscription Livreur</div>
      </div>
      
      <Alert>
        <Icons.info className="h-4 w-4" />
        <AlertDescription>
          En tant que livreur, votre compte sera soumis à validation par notre équipe avant de pouvoir commencer les livraisons.
        </AlertDescription>
      </Alert>
      
      <Form {...form}>
        <form 
          className="space-y-6" 
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={saveFormProgress}
        >
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Informations personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} autoComplete="given-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} autoComplete="family-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="jean.dupont@exemple.com" 
                      {...field} 
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="0612345678" 
                      {...field} 
                      autoComplete="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="********" 
                        {...field} 
                        autoComplete="new-password"
                        id="password-field"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <Icons.eyeOff className="h-4 w-4" /> : <Icons.eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Au moins 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
                  </FormDescription>
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
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="********" 
                      {...field} 
                      autoComplete="new-password"
                      id="confirm-password-field"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-lg mb-2">Informations de livraison</h3>
              
              <FormField
                control={form.control}
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
                        {VEHICLE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choisissez le véhicule que vous utiliserez pour vos livraisons
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="carryCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité de charge</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: 20kg, 0.5m³, etc." {...field} />
                    </FormControl>
                    <FormDescription>
                      Indiquez la capacité maximale que vous pouvez transporter
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de permis</FormLabel>
                      <FormControl>
                        <Input placeholder="Numéro de permis de conduire" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Immatriculation</FormLabel>
                      <FormControl>
                        <Input placeholder="Plaque d'immatriculation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="deliveryZones"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Zones de livraison</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Indiquez les zones géographiques où vous souhaitez effectuer des livraisons (quartiers, villes, codes postaux...)" 
                        className="h-20"
                        {...field} 
                        autoComplete="off"
                        id="delivery-zones-field"
                      />
                    </FormControl>
                    <FormDescription>
                      Séparez les différentes zones par des virgules
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-lg mb-2">Documents justificatifs</h3>
              <div className="border rounded-md p-4">
                <FileUpload
                  endpoint="livreurDocument"
                  onChange={handleDocumentUpload}
                  className="w-full"
                />
                <FormDescription className="mt-2">
                  Téléchargez les documents suivants : permis de conduire, carte d'identité, assurance...
                </FormDescription>
                
                {uploadedDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>Documents téléchargés :</Label>
                    <div className="flex flex-wrap gap-2">
                      {uploadedDocuments.map((doc, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          <Icons.file className="h-3 w-3" />
                          Document {index + 1}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => removeDocument(index)}
                            aria-label={`Supprimer le document ${index + 1}`}
                          >
                            <Icons.x className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-lg mb-2">Disponibilités</h3>
              <div className="border rounded-md p-4">
                <FormItem>
                  <FormLabel>Jours et horaires de disponibilité</FormLabel>
                  <div className="space-y-3">
                    <Accordion type="single" collapsible className="w-full">
                      {DAYS_OF_WEEK.map((day) => (
                        <AccordionItem key={day.value} value={day.value}>
                          <AccordionTrigger>{day.label}</AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Heure de début</Label>
                                <TimeInput />
                              </div>
                              <div>
                                <Label>Heure de fin</Label>
                                <TimeInput />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                  <FormDescription className="mt-2">
                    Indiquez vos disponibilités pour chaque jour de la semaine
                  </FormDescription>
                </FormItem>
              </div>
            </div>

            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>J'accepte les conditions générales d'utilisation</FormLabel>
                    <FormDescription>
                      En cochant cette case, vous acceptez nos{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        conditions générales d'utilisation
                      </Link>{" "}
                      et notre{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        politique de confidentialité
                      </Link>
                      .
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || uploadedDocuments.length === 0}
            className="w-full"
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            S'inscrire
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
} 