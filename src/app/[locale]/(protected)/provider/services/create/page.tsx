'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  MapPin,
  Clock,
  CreditCard,
  Star,
  Camera,
  Plus,
  Trash2,
  Calendar,
  Home,
  Settings,
  Zap,
  AlertCircle,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Schéma de validation
const serviceFormSchema = z.object({
  title: z
    .string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: z
    .string()
    .min(20, 'La description doit contenir au moins 20 caractères')
    .max(1000, 'La description ne peut pas dépasser 1000 caractères'),
  category: z.string().min(1, 'Veuillez sélectionner une catégorie'),
  subcategory: z.string().optional(),
  type: z.enum(['FIXED_PRICE', 'HOURLY_RATE', 'PACKAGE']),
  pricing: z.object({
    basePrice: z.coerce.number().min(5, 'Le prix minimum est de 5€'),
    hourlyRate: z.coerce.number().optional(),
    packagePrice: z.coerce.number().optional(),
    currency: z.string().default('EUR'),
  }),
  duration: z.object({
    estimatedMinutes: z.coerce.number().min(15, 'Durée minimum de 15 minutes'),
    maxMinutes: z.coerce.number().optional(),
    flexible: z.boolean().default(false),
  }),
  location: z.object({
    type: z.enum(['AT_HOME', 'AT_PROVIDER', 'REMOTE', 'FLEXIBLE']),
    serviceRadius: z.coerce.number().optional(),
    address: z.string().optional(),
  }),
  availability: z.object({
    daysOfWeek: z.array(z.number()).min(1, 'Sélectionnez au moins un jour'),
    timeSlots: z.array(z.object({
      startTime: z.string(),
      endTime: z.string(),
    })).min(1, 'Ajoutez au moins un créneau horaire'),
    advanceNotice: z.coerce.number().min(1, 'Préavis minimum de 1 heure'),
  }),
  requirements: z.object({
    skills: z.array(z.string()),
    equipment: z.array(z.string()),
    experience: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT']),
    certifications: z.array(z.string()),
  }),
  options: z.object({
    isActive: z.boolean().default(true),
    isEmergency: z.boolean().default(false),
    acceptsMultipleClients: z.boolean().default(false),
    providesEquipment: z.boolean().default(false),
    hasInsurance: z.boolean().default(false),
  }),
  media: z.object({
    photos: z.array(z.string()).max(10, 'Maximum 10 photos'),
    videos: z.array(z.string()).max(3, 'Maximum 3 vidéos'),
  }),
  terms: z.object({
    cancellationPolicy: z.string().min(10, 'Politique d\'annulation requise'),
    refundPolicy: z.string().min(10, 'Politique de remboursement requise'),
    additionalTerms: z.string().optional(),
  }),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

// Catégories de services
const SERVICE_CATEGORIES = [
  { value: 'HOME_MAINTENANCE', label: 'Entretien de la maison', icon: <Home className="h-4 w-4" /> },
  { value: 'REPAIR', label: 'Réparations', icon: <Settings className="h-4 w-4" /> },
  { value: 'CLEANING', label: 'Nettoyage', icon: <Zap className="h-4 w-4" /> },
  { value: 'GARDENING', label: 'Jardinage', icon: <Package className="h-4 w-4" /> },
  { value: 'PERSONAL_CARE', label: 'Soins personnels', icon: <Star className="h-4 w-4" /> },
  { value: 'TUTORING', label: 'Cours particuliers', icon: <Star className="h-4 w-4" /> },
  { value: 'PET_CARE', label: 'Garde d\'animaux', icon: <Star className="h-4 w-4" /> },
  { value: 'EVENTS', label: 'Événements', icon: <Calendar className="h-4 w-4" /> },
];

// Jours de la semaine
const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export default function CreateServicePage() {
  const t = useTranslations('services');
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Mutation pour créer le service
  const createServiceMutation = api.provider.services.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Service créé avec succès',
        description: 'Votre service a été ajouté à votre catalogue',
      });
      router.push(`/provider/services/${data.id}`);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la création',
        description: error.message,
      });
      setIsSubmitting(false);
    },
  });

  // Configuration du formulaire
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      type: 'FIXED_PRICE',
      pricing: {
        basePrice: 0,
        currency: 'EUR',
      },
      duration: {
        estimatedMinutes: 60,
        flexible: false,
      },
      location: {
        type: 'AT_HOME',
      },
      availability: {
        daysOfWeek: [],
        timeSlots: [{ startTime: '09:00', endTime: '17:00' }],
        advanceNotice: 24,
      },
      requirements: {
        skills: [],
        equipment: [],
        experience: 'INTERMEDIATE',
        certifications: [],
      },
      options: {
        isActive: true,
        isEmergency: false,
        acceptsMultipleClients: false,
        providesEquipment: false,
        hasInsurance: false,
      },
      media: {
        photos: [],
        videos: [],
      },
      terms: {
        cancellationPolicy: '',
        refundPolicy: '',
      },
    },
  });

  // Surveiller le type de service pour ajuster les champs
  const serviceType = form.watch('type');
  const locationType = form.watch('location.type');

  // Gérer la soumission du formulaire
  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      await createServiceMutation.mutateAsync(data);
    } catch (error) {
      // L'erreur est gérée dans onError
    }
  };

  // Ajouter un créneau horaire
  const addTimeSlot = () => {
    const currentSlots = form.getValues('availability.timeSlots');
    form.setValue('availability.timeSlots', [
      ...currentSlots,
      { startTime: '09:00', endTime: '17:00' },
    ]);
  };

  // Supprimer un créneau horaire
  const removeTimeSlot = (index: number) => {
    const currentSlots = form.getValues('availability.timeSlots');
    if (currentSlots.length > 1) {
      form.setValue(
        'availability.timeSlots',
        currentSlots.filter((_, i) => i !== index)
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Créer un nouveau service
          </h1>
          <p className="text-muted-foreground">
            Ajoutez un service à votre catalogue pour commencer à recevoir des demandes
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <Card>
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Informations
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Tarification
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Disponibilité
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Détails
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-6">
                <TabsContent value="basic" className="space-y-6">
                  {/* Informations de base */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre du service</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Réparation d'électroménager à domicile"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Choisissez un titre clair et descriptif
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description détaillée</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Décrivez votre service en détail..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Expliquez ce que vous proposez, votre expérience, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Catégorie</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez une catégorie" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SERVICE_CATEGORIES.map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                      <div className="flex items-center gap-2">
                                        {category.icon}
                                        {category.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="requirements.experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Niveau d'expérience</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BEGINNER">Débutant</SelectItem>
                                  <SelectItem value="INTERMEDIATE">Intermédiaire</SelectItem>
                                  <SelectItem value="EXPERT">Expert</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Lieu du service */}
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Lieu du service
                    </h3>

                    <FormField
                      control={form.control}
                      name="location.type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de prestation</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
                                <FormControl>
                                  <RadioGroupItem value="AT_HOME" />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-medium">À domicile</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Je me déplace chez le client
                                  </p>
                                </div>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
                                <FormControl>
                                  <RadioGroupItem value="AT_PROVIDER" />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-medium">Chez moi</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Le client vient chez moi
                                  </p>
                                </div>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
                                <FormControl>
                                  <RadioGroupItem value="REMOTE" />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-medium">À distance</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Service en ligne ou par téléphone
                                  </p>
                                </div>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
                                <FormControl>
                                  <RadioGroupItem value="FLEXIBLE" />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-medium">Flexible</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Selon les besoins du client
                                  </p>
                                </div>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(locationType === 'AT_HOME' || locationType === 'FLEXIBLE') && (
                      <FormField
                        control={form.control}
                        name="location.serviceRadius"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rayon d'intervention (km)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="20"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Distance maximale depuis votre position
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-6">
                  {/* Type de tarification */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Tarification
                    </h3>

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mode de tarification</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="grid grid-cols-1 gap-4"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
                                <FormControl>
                                  <RadioGroupItem value="FIXED_PRICE" />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-medium">Prix fixe</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Tarif unique pour le service complet
                                  </p>
                                </div>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
                                <FormControl>
                                  <RadioGroupItem value="HOURLY_RATE" />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-medium">Tarif horaire</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Facturé à l'heure d'intervention
                                  </p>
                                </div>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
                                <FormControl>
                                  <RadioGroupItem value="PACKAGE" />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-medium">Forfait</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    Prix forfaitaire incluant plusieurs prestations
                                  </p>
                                </div>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pricing.basePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {serviceType === 'HOURLY_RATE' ? 'Tarif horaire (€)' : 'Prix de base (€)'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="25.00"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="duration.estimatedMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Durée estimée (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="60"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Temps approximatif pour réaliser le service
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="duration.flexible"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Durée flexible</FormLabel>
                            <FormDescription>
                              La durée peut varier selon les besoins
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="availability" className="space-y-6">
                  {/* Disponibilité */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Disponibilité
                    </h3>

                    <FormField
                      control={form.control}
                      name="availability.daysOfWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jours de disponibilité</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <FormItem
                                key={day.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      const updatedDays = checked
                                        ? [...(field.value || []), day.value]
                                        : (field.value || []).filter((d) => d !== day.value);
                                      field.onChange(updatedDays);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {day.label}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Créneaux horaires</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTimeSlot}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter un créneau
                        </Button>
                      </div>

                      {form.watch('availability.timeSlots').map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Controller
                            control={form.control}
                            name={`availability.timeSlots.${index}.startTime`}
                            render={({ field }) => (
                              <Input type="time" {...field} className="w-32" />
                            )}
                          />
                          <span>à</span>
                          <Controller
                            control={form.control}
                            name={`availability.timeSlots.${index}.endTime`}
                            render={({ field }) => (
                              <Input type="time" {...field} className="w-32" />
                            )}
                          />
                          {form.watch('availability.timeSlots').length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeTimeSlot(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <FormField
                      control={form.control}
                      name="availability.advanceNotice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Préavis minimum (heures)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="24"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Temps minimum avant la prestation pour accepter une réservation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-6">
                  {/* Options du service */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Options du service</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="options.isEmergency"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Service d'urgence</FormLabel>
                              <FormDescription>
                                Disponible pour les interventions urgentes
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="options.providesEquipment"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Fournis l'équipement</FormLabel>
                              <FormDescription>
                                J'apporte mes propres outils/matériaux
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="options.hasInsurance"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Assuré professionnel</FormLabel>
                              <FormDescription>
                                J'ai une assurance responsabilité civile
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="options.acceptsMultipleClients"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Accepte plusieurs clients</FormLabel>
                              <FormDescription>
                                Peut servir plusieurs clients simultanément
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Conditions générales */}
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Conditions de service</h3>

                    <FormField
                      control={form.control}
                      name="terms.cancellationPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Politique d'annulation</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Décrivez votre politique d'annulation..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Conditions d'annulation et de modification des réservations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="terms.refundPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Politique de remboursement</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Décrivez votre politique de remboursement..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Conditions de remboursement en cas de problème
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </CardContent>

              {/* Actions */}
              <div className="flex justify-between items-center p-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>

                <div className="flex gap-2">
                  {activeTab !== 'details' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const tabs = ['basic', 'pricing', 'availability', 'details'];
                        const currentIndex = tabs.indexOf(activeTab);
                        if (currentIndex < tabs.length - 1) {
                          setActiveTab(tabs[currentIndex + 1]);
                        }
                      }}
                    >
                      Suivant
                    </Button>
                  )}

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Créer le service
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </Tabs>
        </form>
      </Form>

      {/* Aide */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Conseil</AlertTitle>
        <AlertDescription>
          Plus votre service est détaillé, plus vous avez de chances d'attirer des clients.
          N'hésitez pas à mentionner votre expérience et vos qualifications.
        </AlertDescription>
      </Alert>
    </div>
  );
}