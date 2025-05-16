import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SaveIcon, XIcon } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useProfileStore } from '@/store/use-profile-store';
import {
  updateDelivererProfileSchema,
  type UpdateDelivererProfile,
} from '@/schemas/profile.schema';
import { Checkbox } from '@/components/ui/checkbox';

const daysOfWeek = [
  { id: 'monday', label: 'Lundi' },
  { id: 'tuesday', label: 'Mardi' },
  { id: 'wednesday', label: 'Mercredi' },
  { id: 'thursday', label: 'Jeudi' },
  { id: 'friday', label: 'Vendredi' },
  { id: 'saturday', label: 'Samedi' },
  { id: 'sunday', label: 'Dimanche' },
];

const vehicleTypes = [
  { value: 'BIKE', label: 'Vélo' },
  { value: 'ELECTRIC_BIKE', label: 'Vélo électrique' },
  { value: 'SCOOTER', label: 'Scooter' },
  { value: 'MOTORCYCLE', label: 'Moto' },
  { value: 'CAR', label: 'Voiture' },
  { value: 'VAN', label: 'Camionnette' },
  { value: 'TRUCK', label: 'Camion' },
];

export function DelivererProfileForm() {
  const { profile, roleSpecificProfile, updateProfile, isUpdatingProfile } = useProfile();
  const { setIsEditingProfile } = useProfileStore();

  const form = useForm<UpdateDelivererProfile>({
    resolver: zodResolver(updateDelivererProfileSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
      phoneNumber: profile?.phoneNumber || '',
      address: roleSpecificProfile?.address || '',
      phone: roleSpecificProfile?.phone || '',
      vehicleType: roleSpecificProfile?.vehicleType || '',
      licensePlate: roleSpecificProfile?.licensePlate || '',
      maxCapacity: roleSpecificProfile?.maxCapacity || undefined,
      bio: roleSpecificProfile?.bio || '',
      yearsOfExperience: roleSpecificProfile?.yearsOfExperience || undefined,
      preferredVehicle: roleSpecificProfile?.preferredVehicle || '',
      maxWeightCapacity: roleSpecificProfile?.maxWeightCapacity || undefined,
      availableDays: roleSpecificProfile?.availableDays || [],
      taxIdentifier: roleSpecificProfile?.taxIdentifier || '',
    },
  });

  const onSubmit = (data: UpdateDelivererProfile) => {
    updateProfile(data);
    setIsEditingProfile(false);
  };

  const handleCancel = () => {
    setIsEditingProfile(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier mon profil de livreur</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Votre nom" {...field} />
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
                      <Input placeholder="votre.email@exemple.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone personnel</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 6 01 02 03 04" {...field} />
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
                    <FormLabel>Téléphone professionnel</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 6 05 06 07 08" {...field} />
                    </FormControl>
                    <FormDescription>Visible par les clients lors des livraisons</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="123 rue des Lilas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de véhicule</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type de véhicule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map(type => (
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
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plaque d'immatriculation</FormLabel>
                    <FormControl>
                      <Input placeholder="AB-123-CD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="maxCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité de chargement (volume)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                        onChange={e =>
                          field.onChange(
                            e.target.value === '' ? undefined : parseFloat(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>En litres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxWeightCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité de charge (poids)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="20"
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                        onChange={e =>
                          field.onChange(
                            e.target.value === '' ? undefined : parseFloat(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>En kilogrammes</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="yearsOfExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Années d'expérience</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2"
                      {...field}
                      value={field.value === undefined ? '' : field.value}
                      onChange={e =>
                        field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxIdentifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro SIRET / Identifiant fiscal</FormLabel>
                  <FormControl>
                    <Input placeholder="12345678901234" {...field} />
                  </FormControl>
                  <FormDescription>
                    Obligatoire pour les auto-entrepreneurs et professionnels
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biographie / Présentation</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez votre expérience et vos spécialités de livraison..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Cette présentation sera visible sur votre profil public
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availableDays"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Jours de disponibilité</FormLabel>
                    <FormDescription>
                      Sélectionnez les jours où vous êtes disponible pour effectuer des livraisons
                    </FormDescription>
                  </div>
                  {daysOfWeek.map(day => (
                    <FormField
                      key={day.id}
                      control={form.control}
                      name="availableDays"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={day.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(day.id)}
                                onCheckedChange={checked => {
                                  return checked
                                    ? field.onChange([...(field.value || []), day.id])
                                    : field.onChange(
                                        field.value?.filter(value => value !== day.id)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{day.label}</FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={handleCancel}>
              <XIcon className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit" disabled={isUpdatingProfile}>
              <SaveIcon className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
