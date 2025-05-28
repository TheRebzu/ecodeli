// Formulaire d'inscription pour les livreurs
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  delivererRegisterSchema,
  DelivererRegisterSchemaType,
} from '@/schemas/deliverer-register.schema';
import { UserRole } from '@/schemas/register.schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

interface DelivererRegisterFormProps {
  locale?: string; // Ajout de la prop locale
}

export default function DelivererRegisterForm({ locale = 'fr' }: DelivererRegisterFormProps) {
  const router = useRouter();
  const t = useTranslations('auth.register');
  const { toast } = useToast();

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      toast({
        title: t('success.title'),
        // @ts-ignore
        description: t('success.deliverer'),
      });
      router.push(`/${locale}/login?registered=true`);
    },
    onError: (error) => {
      toast({
        title: t('error.title'),
        // @ts-ignore
        description: error.message || t('error.description'),
        variant: 'destructive',
      });
    },
  });

  const form = useForm<DelivererRegisterSchemaType>({
    resolver: zodResolver(delivererRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      state: '',
      country: '',
      vehicleType: 'BICYCLE',
      licensePlate: '',
      availableWeekends: false,
      availableNights: false,
      role: UserRole.DELIVERER,
    },
  });

  async function onSubmit(data: DelivererRegisterSchemaType) {
    try {
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        name: data.name,
        role: 'DELIVERER',
        phone: data.phone,
        address: data.address,
        // Les champs spécifiques aux livreurs seront gérés dans une seconde étape
      });
    } catch (error) {
      // L'erreur est déjà gérée par onError
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('placeholders.name')} {...field} />
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
              <FormLabel>{t('fields.email')}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t('placeholders.email')} {...field} />
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
              <FormLabel>{t('fields.phone')}</FormLabel>
              <FormControl>
                <Input type="tel" placeholder={t('placeholders.phone')} {...field} />
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
              <FormLabel>{t('fields.address')}</FormLabel>
              <FormControl>
                <Input placeholder={t('placeholders.address')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.city')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.city')} {...field} />
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
                <FormLabel>{t('fields.postalCode')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.postalCode')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.state')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.state')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.country')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.country')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="vehicleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.vehicleType')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.vehicleType')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BICYCLE">{t('vehicleTypes.bicycle')}</SelectItem>
                  <SelectItem value="SCOOTER">{t('vehicleTypes.scooter')}</SelectItem>
                  <SelectItem value="CAR">{t('vehicleTypes.car')}</SelectItem>
                  <SelectItem value="VAN">{t('vehicleTypes.van')}</SelectItem>
                  <SelectItem value="TRUCK">{t('vehicleTypes.truck')}</SelectItem>
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
              <FormLabel>{t('fields.licensePlate')}</FormLabel>
              <FormControl>
                <Input placeholder={t('placeholders.licensePlate')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="availableWeekends"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>{t('fields.availableWeekends')}</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="availableNights"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>{t('fields.availableNights')}</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.password')}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t('placeholders.password')} {...field} />
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
              <FormLabel>{t('fields.confirmPassword')}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t('placeholders.confirmPassword')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? t('submitting') : t('register')}
        </Button>
      </form>
    </Form>
  );
}
