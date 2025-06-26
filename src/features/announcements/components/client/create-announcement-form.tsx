'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon, Package, Car, Plane, ShoppingCart, Globe, Heart, Home, Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Schéma de validation pour le formulaire
const createAnnouncementSchema = z.object({
  type: z.enum(['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'INTERNATIONAL_PURCHASE', 'PET_SITTING', 'HOME_SERVICE', 'CART_DROP']),
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères').max(100),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères').max(1000),
  
  // Localisation
  pickupAddress: z.string().min(10, 'Adresse de récupération requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  
  // Dates
  pickupDate: z.date().optional(),
  deliveryDate: z.date().optional(),
  isFlexibleDate: z.boolean().default(false),
  
  // Prix
  basePrice: z.number().min(5, 'Prix minimum 5€').max(1000, 'Prix maximum 1000€'),
  isPriceNegotiable: z.boolean().default(false),
  
  // Options
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  specialInstructions: z.string().optional(),
  
  // Détails selon le type
  packageWeight: z.number().optional(),
  packageDimensions: z.string().optional(),
  packageFragile: z.boolean().optional(),
  
  numberOfPassengers: z.number().optional(),
  hasLuggage: z.boolean().optional(),
  
  shoppingBudget: z.number().optional(),
  shoppingList: z.string().optional(),
  
  petType: z.string().optional(),
  petAge: z.number().optional(),
  
  serviceDuration: z.number().optional(),
  serviceType: z.string().optional()
})

type FormData = z.infer<typeof createAnnouncementSchema>

const announcementTypes = [
  { value: 'PACKAGE_DELIVERY', label: 'Livraison de colis', icon: Package, description: 'Transport de colis, documents, objets' },
  { value: 'PERSON_TRANSPORT', label: 'Transport de personnes', icon: Car, description: 'Transport de personnes, covoiturage' },
  { value: 'AIRPORT_TRANSFER', label: 'Transfert aéroport', icon: Plane, description: 'Transfert vers/depuis l\'aéroport' },
  { value: 'SHOPPING', label: 'Courses', icon: ShoppingCart, description: 'Faire les courses à votre place' },
  { value: 'INTERNATIONAL_PURCHASE', label: 'Achat international', icon: Globe, description: 'Achats depuis l\'étranger' },
  { value: 'PET_SITTING', label: 'Garde d\'animaux', icon: Heart, description: 'Garde et soins pour animaux' },
  { value: 'HOME_SERVICE', label: 'Service à domicile', icon: Home, description: 'Services de ménage, jardinage, etc.' },
  { value: 'CART_DROP', label: 'Lâcher de chariot', icon: Truck, description: 'Service phare EcoDeli' }
]

export function CreateAnnouncementForm() {
  const t = useTranslations('announcements')
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      isFlexibleDate: false,
      isPriceNegotiable: false,
      isUrgent: false,
      requiresInsurance: false,
      packageFragile: false,
      hasLuggage: false
    }
  })

  const selectedType = form.watch('type')

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/client/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création')
      }

      toast.success('Annonce créée avec succès !')
      router.push(`/client/announcements/${result.data.id}`)
      
    } catch (error) {
      console.error('Error creating announcement:', error)
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderTypeSpecificFields = () => {
    switch (selectedType) {
      case 'PACKAGE_DELIVERY':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails du colis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="packageWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poids (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="2.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="packageDimensions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensions (LxlxH en cm)</FormLabel>
                    <FormControl>
                      <Input placeholder="30x20x15" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="packageFragile"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Colis fragile</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )

      case 'PERSON_TRANSPORT':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails du transport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="numberOfPassengers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de passagers</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="8"
                        placeholder="2"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasLuggage"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Avec bagages</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )

      case 'SHOPPING':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails des courses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="shoppingBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget courses (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="50"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="shoppingList"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liste de courses</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="- Pain&#10;- Lait&#10;- Pommes de terre..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )

      case 'PET_SITTING':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails de l'animal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="petType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'animal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dog">Chien</SelectItem>
                        <SelectItem value="cat">Chat</SelectItem>
                        <SelectItem value="bird">Oiseau</SelectItem>
                        <SelectItem value="rabbit">Lapin</SelectItem>
                        <SelectItem value="fish">Poisson</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="petAge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Âge (années)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="30"
                        placeholder="3"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )

      case 'HOME_SERVICE':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails du service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de service</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cleaning">Ménage</SelectItem>
                        <SelectItem value="gardening">Jardinage</SelectItem>
                        <SelectItem value="handyman">Bricolage</SelectItem>
                        <SelectItem value="cooking">Cuisine</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="serviceDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée estimée (heures)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="8"
                        placeholder="2"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Créer une annonce</h1>
        <p className="text-muted-foreground mt-2">
          Décrivez votre besoin et trouvez le bon prestataire
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Sélection du type d'annonce */}
          <Card>
            <CardHeader>
              <CardTitle>Type d'annonce</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {announcementTypes.map((type) => {
                          const Icon = type.icon
                          return (
                            <div
                              key={type.value}
                              className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-colors hover:bg-accent",
                                field.value === type.value && "border-primary bg-primary/5"
                              )}
                              onClick={() => field.onChange(type.value)}
                            >
                              <div className="flex flex-col items-center text-center space-y-2">
                                <Icon className="h-8 w-8" />
                                <h3 className="font-medium text-sm">{type.label}</h3>
                                <p className="text-xs text-muted-foreground">{type.description}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre de l'annonce</FormLabel>
                    <FormControl>
                      <Input placeholder="Livraison colis urgent..." {...field} />
                    </FormControl>
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
                        placeholder="Décrivez votre besoin en détail..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Localisation */}
          <Card>
            <CardHeader>
              <CardTitle>Localisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de récupération</FormLabel>
                    <FormControl>
                      <Input placeholder="123 rue de la Paix, 75001 Paris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de livraison</FormLabel>
                    <FormControl>
                      <Input placeholder="456 avenue des Champs, 75008 Paris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Dates et horaires */}
          <Card>
            <CardHeader>
              <CardTitle>Dates et horaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de récupération</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
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
                
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de livraison</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
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
              
              <FormField
                control={form.control}
                name="isFlexibleDate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Dates flexibles</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Je suis flexible sur les dates de récupération/livraison
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Prix et options */}
          <Card>
            <CardHeader>
              <CardTitle>Prix et options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix proposé (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="25"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isPriceNegotiable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Prix négociable</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isUrgent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Urgent</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="requiresInsurance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Assurance requise</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Protection supplémentaire pour votre envoi
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Champs spécifiques selon le type */}
          {selectedType && renderTypeSpecificFields()}

          {/* Instructions spéciales */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions spéciales (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Instructions particulières, consignes d'accès, etc."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Création...' : 'Créer l\'annonce'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}