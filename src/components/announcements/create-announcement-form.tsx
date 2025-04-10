"use client";

import { useState } from "react";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUploader } from "@/components/ui/file-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Schéma de validation pour le formulaire d'annonce
const announcementFormSchema = z.object({
  // Informations générales
  title: z.string().min(5, {
    message: "Le titre doit contenir au moins 5 caractères",
  }),
  description: z.string().min(10, {
    message: "La description doit contenir au moins 10 caractères",
  }),
  
  // Informations sur le paquet
  packageType: z.enum([
    "SMALL_ENVELOPE", 
    "LARGE_ENVELOPE", 
    "SMALL_PACKAGE", 
    "MEDIUM_PACKAGE", 
    "LARGE_PACKAGE", 
    "EXTRA_LARGE", 
    "PALLET"
  ]),
  weight: z.number().min(0.01, {
    message: "Le poids doit être supérieur à 0",
  }),
  width: z.number().optional(),
  height: z.number().optional(),
  length: z.number().optional(),
  isFragile: z.boolean().default(false),
  requiresRefrigeration: z.boolean().default(false),
  
  // Adresse de ramassage
  pickupAddress: z.string().min(5, {
    message: "L'adresse de ramassage est requise",
  }),
  pickupCity: z.string().min(1, {
    message: "La ville de ramassage est requise",
  }),
  pickupPostalCode: z.string().min(1, {
    message: "Le code postal de ramassage est requis",
  }),
  pickupCountry: z.string().default("France"),
  
  // Adresse de livraison
  deliveryAddress: z.string().min(5, {
    message: "L'adresse de livraison est requise",
  }),
  deliveryCity: z.string().min(1, {
    message: "La ville de livraison est requise",
  }),
  deliveryPostalCode: z.string().min(1, {
    message: "Le code postal de livraison est requis",
  }),
  deliveryCountry: z.string().default("France"),
  
  // Informations temporelles
  pickupDate: z.date({
    required_error: "La date de ramassage est requise",
  }),
  deliveryDeadline: z.date({
    required_error: "La date limite de livraison est requise",
  }),
  
  // Informations sur le prix
  price: z.number().min(0, {
    message: "Le prix doit être supérieur ou égal à 0",
  }),
  isNegotiable: z.boolean().default(false),
  
  // Assurance
  insuranceOption: z.enum(["NONE", "BASIC", "PREMIUM", "CUSTOM"]).default("NONE"),
  insuranceAmount: z.number().optional(),
  
  // Images du colis
  packageImages: z.array(z.string()).optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export function CreateAnnouncementForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form: UseFormReturn<AnnouncementFormValues> = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: "",
      description: "",
      packageType: "SMALL_PACKAGE" as const,
      weight: 0,
      width: 0,
      height: 0,
      length: 0,
      isFragile: false,
      requiresRefrigeration: false,
      pickupAddress: "",
      pickupCity: "",
      pickupPostalCode: "",
      pickupCountry: "France" as const,
      deliveryAddress: "",
      deliveryCity: "",
      deliveryPostalCode: "",
      deliveryCountry: "France" as const,
      price: 0,
      isNegotiable: false,
      insuranceOption: "NONE" as const,
      insuranceAmount: 0,
      packageImages: [],
    },
  });

  const onSubmit: SubmitHandler<AnnouncementFormValues> = async (data) => {
    setIsSubmitting(true);
    
    try {
      const announcementData = {
        ...data,
        type: "CLIENT_REQUEST" as const,
        pickupDate: data.pickupDate.toISOString(),
        deliveryDeadline: data.deliveryDeadline.toISOString(),
        weight: Number(data.weight),
        width: data.width ? Number(data.width) : undefined,
        height: data.height ? Number(data.height) : undefined,
        length: data.length ? Number(data.length) : undefined,
        price: Number(data.price),
        insuranceAmount: data.insuranceAmount ? Number(data.insuranceAmount) : undefined,
      };
      
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(announcementData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Une erreur est survenue lors de la création de l'annonce.");
      }
      
      const result = await response.json();
      toast.success("Annonce créée avec succès!");
      router.push(`/client/announcements/${result.id}`);
      router.refresh();
    } catch (error) {
      console.error("Erreur lors de la création de l'annonce:", error);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Déterminer si le champ d'assurance personnalisée doit être affiché
  const showInsuranceAmount = form.watch("insuranceOption") === "CUSTOM";

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Créer une nouvelle annonce</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Section informations générales */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations générales</h3>
              <Separator />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre de l&apos;annonce</FormLabel>
                    <FormControl>
                      <Input placeholder="Titre de l&apos;annonce" {...field} />
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
                    <FormLabel>Description de l&apos;annonce</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description détaillée de l&apos;annonce" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Section informations sur le paquet */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations sur le colis</h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="packageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de colis</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type de colis" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SMALL_ENVELOPE">Petite enveloppe</SelectItem>
                          <SelectItem value="LARGE_ENVELOPE">Grande enveloppe</SelectItem>
                          <SelectItem value="SMALL_PACKAGE">Petit paquet</SelectItem>
                          <SelectItem value="MEDIUM_PACKAGE">Paquet moyen</SelectItem>
                          <SelectItem value="LARGE_PACKAGE">Grand paquet</SelectItem>
                          <SelectItem value="EXTRA_LARGE">Très grand colis</SelectItem>
                          <SelectItem value="PALLET">Palette</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poids (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 1.5" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longueur (cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="Ex: 30" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Largeur (cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="Ex: 20" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hauteur (cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="Ex: 15" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isFragile"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Contenu fragile</FormLabel>
                        <FormDescription>
                          Cochez cette case si votre colis contient des objets fragiles.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="requiresRefrigeration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Nécessite réfrigération</FormLabel>
                        <FormDescription>
                          Cochez cette case si votre colis doit être maintenu au frais.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Section adresses */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Adresses</h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Adresse de ramassage */}
                <div className="space-y-4">
                  <h4 className="font-medium">Adresse de ramassage</h4>
                  
                  <FormField
                    control={form.control}
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse de ramassage</FormLabel>
                        <FormControl>
                          <Input placeholder="Adresse de ramassage" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pickupCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Paris" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="pickupPostalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 75001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="pickupCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: France" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Adresse de livraison */}
                <div className="space-y-4">
                  <h4 className="font-medium">Adresse de livraison</h4>
                  
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse de livraison</FormLabel>
                        <FormControl>
                          <Input placeholder="Adresse de livraison" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Lyon" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryPostalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 69001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="deliveryCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: France" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            
            {/* Section dates */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dates</h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de ramassage</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date limite de livraison</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Section prix et assurance */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Prix et assurance</h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix proposé (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 15.00" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        Montant que vous êtes prêt à payer pour cette livraison.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isNegotiable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Prix négociable</FormLabel>
                        <FormDescription>
                          Cochez cette case si vous êtes ouvert à la négociation.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="insuranceOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option d'assurance</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une option d'assurance" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Aucune assurance</SelectItem>
                        <SelectItem value="BASIC">Assurance basique (jusqu'à 115€)</SelectItem>
                        <SelectItem value="PREMIUM">Assurance premium (jusqu'à 3000€)</SelectItem>
                        <SelectItem value="CUSTOM">Assurance personnalisée</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choisissez le niveau d'assurance pour votre envoi.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {showInsuranceAmount && (
                <FormField
                  control={form.control}
                  name="insuranceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant de l'assurance (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 5000.00" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        Montant de l'assurance personnalisée (frais supplémentaires).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Section images */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Images du colis</h3>
              <Separator />
              
              <FormField
                control={form.control}
                name="packageImages"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Images du colis</FormLabel>
                    <FormControl>
                      <FileUploader
                        onFilesSelected={(files) => {
                          const promises = files.map((file) => {
                            return new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                resolve(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            });
                          });

                          Promise.all(promises).then((base64Files) => {
                            onChange(base64Files);
                          });
                        }}
                        maxFiles={5}
                        maxSize={5 * 1024 * 1024} // 5MB
                        accept={{
                          "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
                        }}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ajoutez jusqu&apos;à 5 images de votre colis (5MB max par image)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Création en cours..." : "Créer l'annonce"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}