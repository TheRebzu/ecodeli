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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Vehicle types
const VEHICLE_TYPES = [
  { value: VehicleTypeEnum.enum.VELO, label: "Vélo", icon: <Icons.bicycle className="h-5 w-5" /> },
  { value: VehicleTypeEnum.enum.SCOOTER, label: "Scooter", icon: <Icons.image className="h-5 w-5" /> },
  { value: VehicleTypeEnum.enum.VOITURE, label: "Voiture", icon: <Icons.laptop className="h-5 w-5" /> },
  { value: VehicleTypeEnum.enum.CAMIONNETTE, label: "Camionnette", icon: <Icons.package className="h-5 w-5" /> },
  { value: VehicleTypeEnum.enum.CAMION, label: "Camion", icon: <Icons.package className="h-5 w-5" /> },
  { value: VehicleTypeEnum.enum.TRANSPORT_PUBLIC, label: "Transport public", icon: <Icons.laptop className="h-5 w-5" /> },
  { value: VehicleTypeEnum.enum.MARCHE, label: "Marche", icon: <Icons.user className="h-5 w-5" /> },
];

// Days of week
const DAYS_OF_WEEK = [
  { value: DaysOfWeekEnum.enum.LUNDI, label: "Lundi" },
  { value: DaysOfWeekEnum.enum.MARDI, label: "Mardi" },
  { value: DaysOfWeekEnum.enum.MERCREDI, label: "Mercredi" },
  { value: DaysOfWeekEnum.enum.JEUDI, label: "Jeudi" },
  { value: DaysOfWeekEnum.enum.VENDREDI, label: "Vendredi" },
  { value: DaysOfWeekEnum.enum.SAMEDI, label: "Samedi" },
  { value: DaysOfWeekEnum.enum.DIMANCHE, label: "Dimanche" },
];

// Delivery preferences
const DELIVERY_PREFERENCES = [
  { value: "small", label: "Petits colis (< 5kg)" },
  { value: "medium", label: "Colis moyens (5-20kg)" },
  { value: "large", label: "Grands colis (> 20kg)" },
  { value: "fragile", label: "Objets fragiles" },
  { value: "food", label: "Nourriture" },
  { value: "refrigerated", label: "Produits réfrigérés" },
  { value: "assistance", label: "Aide au chargement/déchargement" },
];

// Extended form data interface to include our additional fields
interface ExtendedRegisterFormData extends RegisterFormData {
  civilite?: string;
  dateOfBirth?: string;
  uploadedDocuments?: Record<string, string[]>;
  accountHolder?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  maxDistance?: string;
  fiscalStatus?: string;
  siretNumber?: string;
  courierCharterAccepted?: boolean;
  geoLocationAccepted?: boolean;
  dataProcessingAccepted?: boolean;
}

// Form steps
const FORM_STEPS = [
  { id: "account", title: "Compte", icon: <Icons.user className="h-4 w-4" />, description: "Créez vos identifiants de connexion" },
  { id: "personal", title: "Infos personnelles", icon: <Icons.user className="h-4 w-4" />, description: "Renseignez vos coordonnées personnelles" },
  { id: "identity", title: "Vérification", icon: <Icons.file className="h-4 w-4" />, description: "Vérifiez votre identité" },
  { id: "vehicle", title: "Véhicule", icon: <Icons.bicycle className="h-4 w-4" />, description: "Informations sur votre véhicule" },
  { id: "preferences", title: "Préférences", icon: <Icons.settings className="h-4 w-4" />, description: "Vos préférences de livraison" },
  { id: "banking", title: "Paiement", icon: <Icons.dollarSign className="h-4 w-4" />, description: "Vos coordonnées bancaires" },
  { id: "agreement", title: "Conditions", icon: <Icons.check className="h-4 w-4" />, description: "Acceptation des conditions" },
];

interface CourierRegisterFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CourierRegisterForm({ className, ...props }: CourierRegisterFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string[]>>({
    identity: [],
    drivingLicense: [],
    proofOfAddress: [],
    insurance: [],
    selfie: [],
    vehicle: [],
    profileImage: [],
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [savedFormData, setSavedFormData] = useState<Partial<ExtendedRegisterFormData>>({});
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [autoSaveTimestamp, setAutoSaveTimestamp] = useState<Date | null>(null);

  // Extended form with additional fields
  const form = useForm<ExtendedRegisterFormData>({
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
      address: "",
      city: "",
      postalCode: "",
      country: "France",
      civilite: "",
      accountHolder: "",
      courierCharterAccepted: false,
      geoLocationAccepted: false,
      dataProcessingAccepted: false,
      ...savedFormData,
    },
    mode: "onChange",
  });

  // Load saved form data
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('courierRegisterFormProgress');
      const savedStep = localStorage.getItem('courierRegisterStep');
      
      if (savedProgress) {
        const parsedData = JSON.parse(savedProgress) as Partial<ExtendedRegisterFormData>;
        setSavedFormData(parsedData);
        form.reset({
          ...form.getValues(),
          ...parsedData
        });
        
        // Restore date of birth if exists
        if (parsedData.dateOfBirth) {
          setDateOfBirth(new Date(parsedData.dateOfBirth));
        }
        
        // Restore documents
        if (parsedData.uploadedDocuments) {
          setUploadedDocuments(parsedData.uploadedDocuments);
        }
      }
      
      if (savedStep) {
        setCurrentStep(parseInt(savedStep, 10));
      }
    } catch (error) {
      console.error('Error loading saved form progress', error);
    }
  }, [form]);

  // Auto-save form progress periodically
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (form.formState.isDirty) {
        saveFormProgress();
        setAutoSaveTimestamp(new Date());
      }
    }, 30000); // Auto-save every 30 seconds if the form has changed
    
    return () => clearInterval(autoSaveInterval);
  }, [form.formState.isDirty]);

  // Save form progress
  const saveFormProgress = () => {
    try {
      setIsSaving(true);
      const currentValues = form.getValues() as ExtendedRegisterFormData;
      // Save date of birth
      if (dateOfBirth) {
        currentValues.dateOfBirth = dateOfBirth.toISOString();
      }
      // Save uploaded documents
      currentValues.uploadedDocuments = uploadedDocuments;
      
      // Save to localStorage
      localStorage.setItem('courierRegisterFormProgress', JSON.stringify(currentValues));
      localStorage.setItem('courierRegisterStep', currentStep.toString());
      
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Error saving form progress', error);
      setIsSaving(false);
    }
  };

  // Navigate between steps
  const nextStep = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      saveFormProgress();
      // Scroll to top when changing steps
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      // Scroll to top when changing steps
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < FORM_STEPS.length) {
      setCurrentStep(step);
      // Scroll to top when changing steps
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle document upload
  const handleDocumentUpload = (category: string, url: string) => {
    setUploadedDocuments(prev => {
      const newDocs = { 
        ...prev,
        [category]: prev[category] ? [...prev[category], url] : [url]
      };
      
      setTimeout(() => saveFormProgress(), 0);
      return newDocs;
    });
  };

  // Remove document
  const removeDocument = (category: string, index: number) => {
    setUploadedDocuments(prev => {
      const categoryDocs = [...prev[category]];
      categoryDocs.splice(index, 1);
      
      const newDocs = {
        ...prev,
        [category]: categoryDocs
      };
      
      setTimeout(() => saveFormProgress(), 0);
      return newDocs;
    });
  };

  // Check if a step is complete
  const isStepComplete = (step: number): boolean => {
    const formValues = form.getValues();
    
    switch(step) {
      case 0: // Account
        return !!formValues.email && 
               !!formValues.password && 
               !!formValues.confirmPassword && 
               formValues.password === formValues.confirmPassword;
      
      case 1: // Personal info (including address)
        return !!formValues.firstName && 
               !!formValues.lastName && 
               !!dateOfBirth && 
               !!formValues.phone &&
               !!formValues.address &&
               !!formValues.city &&
               !!formValues.postalCode;
      
      case 2: // Identity verification (only documents)
        return uploadedDocuments.identity.length > 0 && 
               uploadedDocuments.proofOfAddress.length > 0 &&
               uploadedDocuments.selfie.length > 0;
      
      case 3: // Vehicle
        if (formValues.vehicleType === VehicleTypeEnum.enum.MARCHE) {
          return true; // No vehicle docs needed for walking
        }
        return !!formValues.vehicleType && 
               !!formValues.carryCapacity && 
               uploadedDocuments.drivingLicense.length > 0;
      
      case 4: // Preferences
        return !!formValues.deliveryZones;
      
      case 5: // Banking
        return true; // No mandatory fields for banking
      
      case 6: // Agreements
        return !!formValues.termsAccepted;
      
      default:
        return false;
    }
  };

  // Handle form submission
  const onSubmit = async (data: ExtendedRegisterFormData) => {
    setIsLoading(true);
    
    try {
      // Flatten all documents into a single array for the API
      data.documents = Object.values(uploadedDocuments).flat();
      
      // Use useAuth hook for registration
      const success = await signUp(data);
      
      if (success) {
        // Remove saved data after successful registration
        localStorage.removeItem('courierRegisterFormProgress');
        localStorage.removeItem('courierRegisterStep');
        
        // Redirect to verification page
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

  // Calculate progress percentage
  const progressPercentage = ((currentStep + 1) / FORM_STEPS.length) * 100;

  // Calculate overall completion percentage
  const calculateOverallCompletion = (): number => {
    let completedSteps = 0;
    for (let i = 0; i < FORM_STEPS.length; i++) {
      if (isStepComplete(i)) completedSteps++;
    }
    return Math.round((completedSteps / FORM_STEPS.length) * 100);
  };

  // Render progress bar
  const renderProgressBar = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-medium">
          Étape {currentStep + 1} sur {FORM_STEPS.length}
        </div>
        <div className="text-sm text-muted-foreground">
          {isStepComplete(currentStep) ? 
            <span className="text-green-600 flex items-center gap-1">
              <Icons.check className="h-4 w-4" /> Complété
            </span> : 
            "À compléter"
          }
        </div>
      </div>
      
      <Progress value={progressPercentage} className="h-3 mb-4" />
      
      <div className="grid grid-cols-7 gap-2 mt-4">
        {FORM_STEPS.map((step, index) => (
          <TooltipProvider key={step.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={currentStep === index ? "default" : isStepComplete(index) ? "outline" : "ghost"} 
                  size="sm"
                  className={cn(
                    "h-auto py-2 px-2 text-xs rounded-md transition-all",
                    currentStep === index ? "bg-primary text-primary-foreground" : "",
                    isStepComplete(index) && currentStep !== index ? "border-primary text-primary" : "",
                    !isStepComplete(index) && currentStep !== index ? "text-muted-foreground" : ""
                  )}
                  onClick={() => {
                    // Only allow navigation to completed steps or the current step + 1
                    if (isStepComplete(index) || index <= currentStep || index === currentStep + 1) {
                      goToStep(index);
                    }
                  }}
                  disabled={!isStepComplete(index) && index > currentStep + 1}
                >
                  <div className="flex flex-col items-center gap-2">
                    {step.icon}
                    <span className="hidden sm:inline text-[10px]">{step.title}</span>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{step.title}</p>
                <p className="text-xs text-muted-foreground">
                  {isStepComplete(index) ? "Complété" : "À compléter"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );

  // Render account creation step
  const renderAccountStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Créez votre compte livreur</h3>
        <p className="text-muted-foreground text-sm">
          Commencez par créer votre compte pour rejoindre notre plateforme de livraison.
        </p>
      </div>

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                data-testid="email-input"
                placeholder="votre@email.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                {...field}
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
                  data-testid="password-input"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect="off"
                  disabled={isLoading}
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <Icons.eyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icons.eye className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  </span>
                </Button>
              </div>
            </FormControl>
            <FormDescription>
              Au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.
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
                data-testid="confirm-password-input"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect="off"
                disabled={isLoading}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Render personal information step
  const renderPersonalInfoStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl sm:text-2xl font-semibold">Vos informations personnelles</h3>
        <p className="text-muted-foreground">
          Ces informations nous permettent de vous identifier et vous contacter
        </p>
      </div>

      <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg mb-4">
        <div className="flex items-start gap-3">
          <Icons.lock className="h-5 w-5 mt-0.5 text-amber-600" />
          <div>
            <h4 className="font-medium text-amber-800">Vos données sont protégées</h4>
            <p className="text-sm text-amber-700">Toutes les informations personnelles que vous fournissez sont chiffrées et protégées conformément au RGPD. Consultez notre <Link href="/privacy" className="underline">politique de confidentialité</Link>.</p>
          </div>
        </div>
      </div>

      <FormField
        control={form.control}
        name="civilite"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel className="text-base">Civilité</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-wrap gap-4"
              >
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="M" />
                  </FormControl>
                  <FormLabel className="font-normal">M.</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="Mme" />
                  </FormControl>
                  <FormLabel className="font-normal">Mme</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="Autre" />
                  </FormControl>
                  <FormLabel className="font-normal">Autre</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Prénom <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Jean" {...field} autoComplete="given-name" className="h-11" />
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
              <FormLabel className="text-base">Nom <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Dupont" {...field} autoComplete="family-name" className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormItem>
        <FormLabel className="text-base">Date de naissance <span className="text-destructive">*</span></FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full h-11 pl-3 text-left font-normal",
                  !dateOfBirth && "text-muted-foreground"
                )}
              >
                {dateOfBirth ? (
                  format(dateOfBirth, "dd MMMM yyyy", { locale: fr })
                ) : (
                  "Sélectionnez votre date de naissance"
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateOfBirth}
              onSelect={setDateOfBirth}
              disabled={(date) => 
                date > new Date() || 
                date < new Date(new Date().setFullYear(new Date().getFullYear() - 100)) ||
                date > new Date(new Date().setFullYear(new Date().getFullYear() - 18))
              }
              initialFocus
              locale={fr}
            />
          </PopoverContent>
        </Popover>
        <FormDescription>
          Vous devez avoir au moins 18 ans pour être livreur
        </FormDescription>
        {!dateOfBirth && <p className="text-sm font-medium text-destructive">La date de naissance est requise</p>}
      </FormItem>

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base">Téléphone mobile <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input 
                type="tel" 
                placeholder="0612345678" 
                {...field} 
                autoComplete="tel"
                className="h-11"
              />
            </FormControl>
            <FormDescription>
              Utilisé pour les notifications de livraison et communications importantes
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pt-4 border-t border-muted">
        <h3 className="text-lg font-medium mb-4">Adresse</h3>
      
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Adresse <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Numéro, rue, complément..." 
                  {...field} 
                  autoComplete="street-address"
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4">
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Code postal <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="75001" {...field} autoComplete="postal-code" className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Ville <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Paris" {...field} autoComplete="address-level2" className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-muted">
        <h3 className="text-lg font-medium mb-4">Photo de profil</h3>
        <FormDescription className="mb-2">
          Cette photo sera visible par les clients lors de la livraison pour faciliter l'identification
        </FormDescription>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
            <FileUpload
              endpoint="profileImage"
              onChange={(url) => handleDocumentUpload("profileImage", url)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Formats acceptés: JPG, PNG - Max 5MB
            </p>
          </div>
          
          <div>
            {uploadedDocuments.profileImage?.length > 0 ? (
              <div className="grid gap-2">
                <div className="aspect-square w-full max-w-[150px] rounded-lg border overflow-hidden relative bg-muted">
                  <img 
                    src={uploadedDocuments.profileImage[0]} 
                    alt="Photo de profil" 
                    className="object-cover w-full h-full"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeDocument("profileImage", 0)}
                  >
                    <Icons.x className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Icons.check className="h-3 w-3" /> Photo téléchargée
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[150px] rounded-lg border border-dashed">
                <div className="text-center p-4">
                  <Icons.user className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aperçu de la photo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render identity verification step
  const renderIdentityStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl sm:text-2xl font-semibold">Vérification d'identité</h3>
        <p className="text-muted-foreground">
          Ces documents sont nécessaires pour valider votre compte
        </p>
      </div>

      <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <Icons.info className="h-5 w-5 mt-0.5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-800">Pourquoi ces documents sont-ils nécessaires ?</h4>
            <p className="text-sm text-blue-700">Ces documents nous permettent de vérifier votre identité pour assurer la sécurité des clients et garantir la conformité légale. Tous les documents sont traités de manière confidentielle et sécurisée.</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <Icons.user className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Pièce d'identité <span className="text-destructive">*</span></h4>
              <p className="text-sm text-muted-foreground">Carte d'identité ou passeport (recto/verso)</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <FileUpload
                endpoint="identityDocument"
                onChange={(url) => handleDocumentUpload("identity", url)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formats acceptés: JPG, PDF, PNG - Max 10MB
              </p>
            </div>
          </div>
          
          {uploadedDocuments.identity?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedDocuments.identity.map((doc, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 p-2">
                  <Icons.fileText className="h-3 w-3" />
                  Document {index + 1}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeDocument("identity", index)}
                  >
                    <Icons.x className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <Icons.building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Justificatif de domicile <span className="text-destructive">*</span></h4>
              <p className="text-sm text-muted-foreground">Facture d'énergie, téléphone, quittance de loyer (moins de 3 mois)</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <FileUpload
                endpoint="proofOfAddress"
                onChange={(url) => handleDocumentUpload("proofOfAddress", url)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formats acceptés: JPG, PDF, PNG - Max 10MB
              </p>
            </div>
          </div>
          
          {uploadedDocuments.proofOfAddress?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedDocuments.proofOfAddress.map((doc, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 p-2">
                  <Icons.fileText className="h-3 w-3" />
                  Document {index + 1}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeDocument("proofOfAddress", index)}
                  >
                    <Icons.x className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <Icons.image className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Selfie avec pièce d'identité <span className="text-destructive">*</span></h4>
              <p className="text-sm text-muted-foreground">Photo de vous tenant votre pièce d'identité (pour vérification biométrique)</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <FileUpload
                endpoint="selfieDocument"
                onChange={(url) => handleDocumentUpload("selfie", url)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formats acceptés: JPG, PNG - Max 10MB
              </p>
            </div>
          </div>
          
          {uploadedDocuments.selfie?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedDocuments.selfie.map((doc, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 p-2">
                  <Icons.image className="h-3 w-3" />
                  Selfie
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeDocument("selfie", index)}
                  >
                    <Icons.x className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <Icons.lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Attestation d'assurance responsabilité civile</h4>
              <p className="text-sm text-muted-foreground">Document attestant de votre couverture en responsabilité civile</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <FileUpload
                endpoint="insuranceDocument"
                onChange={(url) => handleDocumentUpload("insurance", url)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formats acceptés: JPG, PDF, PNG - Max 10MB
              </p>
            </div>
          </div>
          
          {uploadedDocuments.insurance?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedDocuments.insurance.map((doc, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 p-2">
                  <Icons.fileText className="h-3 w-3" />
                  Document {index + 1}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeDocument("insurance", index)}
                  >
                    <Icons.x className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 p-4 border border-muted rounded-lg">
        <h4 className="font-medium mb-2">Comment prendre une bonne photo de vos documents</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Assurez-vous que le document est bien éclairé</li>
          <li>Placez le document sur une surface plane et unie</li>
          <li>Vérifiez que tous les coins sont visibles</li>
          <li>Assurez-vous que tous les textes sont lisibles</li>
        </ul>
      </div>
    </div>
  );

  // Render vehicle information step
  const renderVehicleStep = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold">Informations sur votre véhicule</h3>
        <p className="text-muted-foreground">
          Ces informations nous permettent de vous proposer des livraisons adaptées
        </p>
      </div>
      
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="vehicleBrand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marque</FormLabel>
              <FormControl>
                <Input placeholder="Renault, Peugeot, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vehicleModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modèle</FormLabel>
              <FormControl>
                <Input placeholder="Clio, 208, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="vehicleYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Année</FormLabel>
              <FormControl>
                <Input type="number" placeholder="2020" {...field} />
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
                <Input placeholder="AB-123-CD" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
      
      <FormField
        control={form.control}
        name="licenseNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Numéro de permis de conduire</FormLabel>
            <FormControl>
              <Input placeholder="Numéro de permis" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Permis de conduire</CardTitle>
          <CardDescription>
            Scan ou photo recto/verso de votre permis de conduire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            endpoint="drivingLicense"
            onChange={(url) => handleDocumentUpload("drivingLicense", url)}
            className="w-full"
          />
          
          {uploadedDocuments.drivingLicense?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedDocuments.drivingLicense.map((doc, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <Icons.file className="h-3 w-3" />
                  Document {index + 1}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeDocument("drivingLicense", index)}
                  >
                    <Icons.x className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Photos du véhicule</CardTitle>
          <CardDescription>
            Ajoutez des photos de votre véhicule (avant, arrière, côtés)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            endpoint="vehiclePhotos"
            onChange={(url) => handleDocumentUpload("vehicle", url)}
            className="w-full"
          />
          
          {uploadedDocuments.vehicle?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedDocuments.vehicle.map((doc, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <Icons.file className="h-3 w-3" />
                  Photo {index + 1}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeDocument("vehicle", index)}
                  >
                    <Icons.x className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render delivery preferences step
  const renderPreferencesStep = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold">Préférences de livraison</h3>
        <p className="text-muted-foreground">
          Indiquez vos préférences pour recevoir des propositions adaptées
        </p>
      </div>

      <FormField
        control={form.control}
        name="deliveryZones"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Zones géographiques</FormLabel>
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

      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium text-base mb-2">Disponibilités</h4>
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
    </div>
  );

  // Render banking information step
  const renderBankingStep = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold">Informations bancaires</h3>
        <p className="text-muted-foreground">
          Ces informations sont nécessaires pour vos paiements
        </p>
      </div>

      <FormField
        control={form.control}
        name="accountHolder"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Titulaire du compte</FormLabel>
            <FormControl>
              <Input 
                placeholder="Nom et prénom du titulaire" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem>
        <FormLabel>IBAN</FormLabel>
        <Input 
          placeholder="FR76..." 
          id="iban-field"
        />
        <FormDescription>
          Numéro IBAN utilisé pour les virements
        </FormDescription>
      </FormItem>

      <Alert variant="default">
        <Icons.info className="h-4 w-4" />
        <AlertDescription>
          Les paiements sont traités de façon sécurisée et vos informations bancaires sont chiffrées.
        </AlertDescription>
      </Alert>

      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium text-base mb-2">Statut fiscal</h4>
        
        <FormField
          control={form.control}
          name="fiscalStatus"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Votre statut</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="auto-entrepreneur" />
                    </FormControl>
                    <FormLabel className="font-normal">Auto-entrepreneur</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="particulier" />
                    </FormControl>
                    <FormLabel className="font-normal">Particulier</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="entreprise" />
                    </FormControl>
                    <FormLabel className="font-normal">Entreprise / Société</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="siretNumber"
          render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel>Numéro SIRET (si auto-entrepreneur / entreprise)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="123 456 789 00012" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  // Render agreement step
  const renderAgreementStep = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold">Conditions et finalisation</h3>
        <p className="text-muted-foreground">
          Dernière étape avant la validation de votre compte
        </p>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Préférences de notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="notify-email" defaultChecked />
            <Label htmlFor="notify-email">Notifications par email</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="notify-sms" defaultChecked />
            <Label htmlFor="notify-sms">Notifications par SMS</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="notify-push" defaultChecked />
            <Label htmlFor="notify-push">Notifications push</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Carte NFC EcoDeli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="request-card" />
            <Label htmlFor="request-card">Je souhaite recevoir la carte NFC EcoDeli</Label>
          </div>
          <FormDescription>
            La carte NFC facilite la validation des livraisons et l'accès aux services EcoDeli
          </FormDescription>
        </CardContent>
      </Card>

      <FormField
        control={form.control}
        name="termsAccepted"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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
      
      <FormField
        control={form.control}
        name="courierCharterAccepted"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>J'accepte la charte des livreurs EcoDeli</FormLabel>
              <FormDescription>
                En cochant cette case, vous vous engagez à respecter la{" "}
                <Link href="/courier-charter" className="text-primary hover:underline">
                  charte des livreurs EcoDeli
                </Link>
                {" "}qui définit les règles de conduite et de service.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="geoLocationAccepted"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>J'autorise la géolocalisation</FormLabel>
              <FormDescription>
                Cette fonctionnalité est nécessaire pour vous proposer des livraisons pertinentes et suivre les colis.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="dataProcessingAccepted"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Je consens au traitement de mes données</FormLabel>
              <FormDescription>
                Conformément au RGPD, vous consentez au traitement de vos données personnelles pour les finalités décrites dans notre{" "}
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
  );

  return (
    <div className="w-full h-full">
      <div className={cn("w-full h-full flex flex-col bg-background", className)} {...props}>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] h-full w-full overflow-hidden">
          {/* Barre latérale avec les étapes */}
          <div className="hidden lg:flex flex-col bg-muted/30 border-r p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col space-y-1.5">
              <h2 className="text-2xl font-bold">Inscription Livreur</h2>
              <p className="text-muted-foreground text-sm">
                Rejoignez notre équipe de livreurs et commencez à gagner de l'argent tout en contribuant à un service de livraison éco-responsable.
              </p>
            </div>
            
            <div className="hidden lg:block mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium">Étape {currentStep + 1}/{FORM_STEPS.length}</h2>
                  {isStepComplete(currentStep) && (
                    <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                      <Icons.check className="mr-1 h-3 w-3" /> Complété
                    </Badge>
                  )}
                </div>
              </div>
              
              <Progress value={progressPercentage} className="h-2 mb-6" />
              
              <div className="space-y-1">
                {FORM_STEPS.map((step, index) => (
                  <div 
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={cn(
                      "flex items-center p-2 rounded-lg transition-colors cursor-pointer",
                      currentStep === index 
                        ? "bg-primary text-primary-foreground" 
                        : isStepComplete(index)
                          ? "bg-muted hover:bg-muted/80" 
                          : "bg-background border hover:bg-muted/30"
                    )}
                  >
                    <div className="mr-2">{step.icon}</div>
                    <span className="text-sm">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contenu principal du formulaire */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
            <div className="lg:hidden mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-medium">Étape {currentStep + 1}/{FORM_STEPS.length}</h2>
                {isStepComplete(currentStep) && (
                  <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                    <Icons.check className="mr-1 h-3 w-3" /> Complété
                  </Badge>
                )}
              </div>
              
              <Progress value={progressPercentage} className="h-2 mb-4" />
              
              <div className="grid grid-cols-7 gap-2 overflow-x-auto">
                {FORM_STEPS.map((step, index) => (
                  <div 
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer",
                      currentStep === index 
                        ? "bg-primary text-primary-foreground" 
                        : isStepComplete(index)
                          ? "bg-muted hover:bg-muted/80" 
                          : "bg-background border hover:bg-muted/30"
                    )}
                  >
                    <div className="mb-1">{step.icon}</div>
                    <span className="text-[10px] text-center truncate w-full">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <Form {...form}>
              <form className="space-y-6 w-full">
                <div className="bg-card rounded-xl p-4 sm:p-6 border shadow-sm">
                  {currentStep === 0 && renderAccountStep()}
                  {currentStep === 1 && renderPersonalInfoStep()}
                  {currentStep === 2 && renderIdentityStep()}
                  {currentStep === 3 && renderVehicleStep()}
                  {currentStep === 4 && renderPreferencesStep()}
                  {currentStep === 5 && renderBankingStep()}
                  {currentStep === 6 && renderAgreementStep()}
                </div>

                <div className="flex justify-between pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 sm:mx-0 sm:p-0 sm:static sm:bg-transparent">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="h-12 px-4 sm:px-6"
                  >
                    <Icons.arrowLeft className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Précédent</span>
                    <span className="sm:hidden">Retour</span>
                  </Button>

                  {currentStep < FORM_STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="h-12 px-4 sm:px-6"
                    >
                      <span className="hidden sm:inline">Suivant</span>
                      <span className="sm:hidden">Suite</span>
                      <Icons.arrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={isLoading}
                      className="h-12 px-4 sm:px-6"
                    >
                      {isLoading ? (
                        <>
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Création en cours...</span>
                          <span className="sm:hidden">Envoi...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Créer mon compte</span>
                          <span className="sm:hidden">Terminer</span>
                          <Icons.check className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
} 