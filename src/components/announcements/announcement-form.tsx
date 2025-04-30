'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createAnnouncementSchema, updateAnnouncementSchema } from '@/schemas/announcement.schema';
import { AnnouncementPriority, AnnouncementType, Announcement } from '@/types/announcement';
import { useAnnouncement } from '@/hooks/use-announcement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PhotoUpload } from './photo-upload';
import { AddressMapPicker } from './address-map-picker';

type AnnouncementFormProps = {
  announcement?: Announcement;
  isEdit?: boolean;
};

export function AnnouncementForm({ announcement, isEdit = false }: AnnouncementFormProps) {
  const t = useTranslations('announcements');
  const router = useRouter();
  const {
    createAnnouncement,
    updateAnnouncement,
    isCreating,
    isUpdating,
    announcementTypes,
    announcementPriorities,
  } = useAnnouncement();

  const schema = isEdit ? updateAnnouncementSchema : createAnnouncementSchema;

  // Configuration du formulaire avec React Hook Form et Zod
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues:
      isEdit && announcement
        ? {
            id: announcement.id,
            title: announcement.title,
            description: announcement.description,
            type: announcement.type,
            priority: announcement.priority,
            pickupAddress: announcement.pickupAddress,
            pickupLongitude: announcement.pickupLongitude,
            pickupLatitude: announcement.pickupLatitude,
            deliveryAddress: announcement.deliveryAddress,
            deliveryLongitude: announcement.deliveryLongitude,
            deliveryLatitude: announcement.deliveryLatitude,
            weight: announcement.weight,
            width: announcement.width,
            height: announcement.height,
            length: announcement.length,
            isFragile: announcement.isFragile,
            needsCooling: announcement.needsCooling,
            pickupDate: announcement.pickupDate,
            pickupTimeWindow: announcement.pickupTimeWindow,
            deliveryDate: announcement.deliveryDate,
            deliveryTimeWindow: announcement.deliveryTimeWindow,
            isFlexible: announcement.isFlexible,
            suggestedPrice: announcement.suggestedPrice,
            isNegotiable: announcement.isNegotiable,
            tags: announcement.tags,
            notes: announcement.notes,
            photos: announcement.photos || [],
            estimatedDistance: announcement.estimatedDistance,
            estimatedDuration: announcement.estimatedDuration,
            requiresSignature: announcement.requiresSignature,
            requiresId: announcement.requiresId,
            specialInstructions: announcement.specialInstructions,
          }
        : {
            title: '',
            description: '',
            type: AnnouncementType.PACKAGE,
            priority: AnnouncementPriority.MEDIUM,
            pickupAddress: '',
            deliveryAddress: '',
            isFragile: false,
            needsCooling: false,
            isFlexible: false,
            isNegotiable: true,
            tags: [],
            photos: [],
            requiresSignature: false,
            requiresId: false,
          },
  });

  // Fonction de soumission du formulaire
  function onSubmit(data: CreateAnnouncementSchemaType | UpdateAnnouncementSchemaType) {
    if (isEdit && announcement) {
      updateAnnouncement(data as UpdateAnnouncementSchemaType);
    } else {
      createAnnouncement(data as CreateAnnouncementSchemaType);
    }
  }

  function estimateDistanceAndDuration(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) {
    // Calcul simple de la distance à vol d'oiseau (formule de Haversine)
    const R = 6371; // Rayon de la Terre en km
    const dLat = (endLat - startLat) * (Math.PI / 180);
    const dLon = (endLng - startLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(startLat * (Math.PI / 180)) *
        Math.cos(endLat * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimation approximative de la durée (1 km ≈ 1.5 min en ville)
    const duration = Math.round(distance * 1.5);

    // Mise à jour des champs du formulaire
    form.setValue('estimatedDistance', parseFloat(distance.toFixed(1)));
    form.setValue('estimatedDuration', duration);
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? t('editAnnouncement') : t('createAnnouncement')}</CardTitle>
        <CardDescription>
          {isEdit ? t('editAnnouncementDescription') : t('createAnnouncementDescription')}
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Section Informations générales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('generalInformation')}</h3>
              <Separator />

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('titleLabel') || 'Titre'}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('titlePlaceholder')} {...field} />
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
                      <FormLabel>{t('typeLabel') || 'Type'}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            {field.value ? <>{t(`type.${field.value}`)}</> : <>{t('selectType')}</>}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(AnnouncementType).map(type => (
                            <SelectItem key={type} value={type}>
                              {t(`type.${type}`)}
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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('priorityLabel') || 'Priorité'}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            {field.value ? (
                              <>{t(`priority.${field.value}`)}</>
                            ) : (
                              <>{t('selectPriority')}</>
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(AnnouncementPriority).map(priority => (
                            <SelectItem key={priority} value={priority}>
                              {t(`priority.${priority}`)}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('descriptionLabel') || 'Description'}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('descriptionPlaceholder')}
                          {...field}
                          className="min-h-32"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Adresses */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('addresses')}</h3>
              <Separator />

              {/* Adresse de ramassage avec carte */}
              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <AddressMapPicker
                      label={t('pickupAddress')}
                      placeholder={t('pickupAddressPlaceholder')}
                      initialAddress={field.value}
                      initialLatitude={form.getValues('pickupLatitude')}
                      initialLongitude={form.getValues('pickupLongitude')}
                      onAddressChange={(address, lat, lng) => {
                        field.onChange(address);
                        form.setValue('pickupLatitude', lat);
                        form.setValue('pickupLongitude', lng);

                        // Estimation de la distance et durée si les deux adresses sont disponibles
                        const deliveryLat = form.getValues('deliveryLatitude');
                        const deliveryLng = form.getValues('deliveryLongitude');
                        if (deliveryLat && deliveryLng) {
                          estimateDistanceAndDuration(lat, lng, deliveryLat, deliveryLng);
                        }
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Adresse de livraison avec carte */}
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <AddressMapPicker
                      label={t('deliveryAddress')}
                      placeholder={t('deliveryAddressPlaceholder')}
                      initialAddress={field.value}
                      initialLatitude={form.getValues('deliveryLatitude')}
                      initialLongitude={form.getValues('deliveryLongitude')}
                      onAddressChange={(address, lat, lng) => {
                        field.onChange(address);
                        form.setValue('deliveryLatitude', lat);
                        form.setValue('deliveryLongitude', lng);

                        // Estimation de la distance et durée si les deux adresses sont disponibles
                        const pickupLat = form.getValues('pickupLatitude');
                        const pickupLng = form.getValues('pickupLongitude');
                        if (pickupLat && pickupLng) {
                          estimateDistanceAndDuration(pickupLat, pickupLng, lat, lng);
                        }
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Distance et durée estimées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="estimatedDistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('estimatedDistance')} (km)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={field.value || ''}
                          onChange={e =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                          readOnly
                        />
                      </FormControl>
                      <FormDescription>{t('estimatedDistanceDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('estimatedDuration')} (min)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="1"
                          placeholder="0"
                          value={field.value || ''}
                          onChange={e =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                          }
                          readOnly
                        />
                      </FormControl>
                      <FormDescription>{t('estimatedDurationDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Détails de l'envoi */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('packageDetails')}</h3>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Poids */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('weight')} (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={field.value || ''}
                          onChange={e =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dimensions */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Largeur */}
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('width')} (cm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hauteur */}
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('height')} (cm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Longueur */}
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('length')} (cm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fragile */}
                <FormField
                  control={form.control}
                  name="isFragile"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('isFragile')}</FormLabel>
                        <FormDescription>{t('isFragileDescription')}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Nécessite réfrigération */}
                <FormField
                  control={form.control}
                  name="needsCooling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('needsCooling')}</FormLabel>
                        <FormDescription>{t('needsCoolingDescription')}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Planification */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('scheduling') || 'Planification'}</h3>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('pickupDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: fr })
                              ) : (
                                <span>{t('selectDate') || 'Sélectionner une date'}</span>
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
                            disabled={date => {
                              return date < new Date(new Date().setHours(0, 0, 0, 0));
                            }}
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
                  name="pickupTimeWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pickupTimeWindow')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="14:00-16:00" />
                      </FormControl>
                      <FormDescription>
                        {t('timeWindowDescription') ||
                          'Spécifiez une plage horaire (ex: 14:00-16:00)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('deliveryDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: fr })
                              ) : (
                                <span>{t('selectDate') || 'Sélectionner une date'}</span>
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
                            disabled={date => {
                              const pickupDate = form.getValues('pickupDate');
                              return (
                                date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                (pickupDate && date < pickupDate)
                              );
                            }}
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
                  name="deliveryTimeWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('deliveryTimeWindow')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="14:00-16:00" />
                      </FormControl>
                      <FormDescription>
                        {t('timeWindowDescription') ||
                          'Spécifiez une plage horaire (ex: 14:00-16:00)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="isFlexible"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('isFlexible')}</FormLabel>
                          <FormDescription>{t('isFlexibleDescription')}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Section Prix */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('pricing')}</h3>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="suggestedPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('suggestedPrice')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('suggestedPriceDescription') || 'Prix suggéré pour cette livraison'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prix négociable */}
                <FormField
                  control={form.control}
                  name="isNegotiable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('isNegotiable')}</FormLabel>
                        <FormDescription>{t('isNegotiableDescription')}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('additionalInformation')}</h3>
              <Separator />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={t('notesPlaceholder')} rows={3} />
                    </FormControl>
                    <FormDescription>{t('notesDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section Exigences de livraison */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('deliveryRequirements')}</h3>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requiresSignature"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('requiresSignature')}</FormLabel>
                        <FormDescription>{t('requiresSignatureDescription')}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiresId"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('requiresId')}</FormLabel>
                        <FormDescription>{t('requiresIdDescription')}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('specialInstructions')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('specialInstructionsPlaceholder')}
                        rows={3}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>{t('specialInstructionsDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section Photos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('photos')}</h3>
              <Separator />

              <FormField
                control={form.control}
                name="photos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('uploadPhotos')}</FormLabel>
                    <FormControl>
                      <PhotoUpload
                        initialPhotos={field.value}
                        onChange={field.onChange}
                        maxPhotos={5}
                      />
                    </FormControl>
                    <FormDescription>{t('photosDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isEdit
                ? isUpdating
                  ? t('updating')
                  : t('updateAnnouncement')
                : isCreating
                  ? t('creating')
                  : t('createAnnouncement')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
