'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  delivererRegisterSchema,
  DelivererRegisterSchemaType,
} from '@/schemas/auth/deliverer-register.schema';
import { UserRole } from '@/schemas/auth/register.schema';
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

type DelivererRegisterFormProps = {
  locale: string;
};

export default function DelivererRegisterForm({ locale }: DelivererRegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth.register');

  const form = useForm<DelivererRegisterSchemaType>({
    resolver: zodResolver(delivererRegisterSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phoneNumber: '',
      address: '',
      city: '',
      postalCode: '',
      state: '',
      country: '',
      phone: '',
      vehicleType: 'CAR' as const,
      licensePlate: '',
      availableWeekends: false,
      availableNights: false,
      role: UserRole.DELIVERER,
    },
  });

  async function onSubmit(data: DelivererRegisterSchemaType) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Redirect to verification page or login
      router.push(`/${locale}/login?registered=true`);
    } catch (error) {
      console.error('Registration error:', error);
      // Handle error (show toast message, etc.)
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        <FormField
          control={form.control as any}
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
          control={form.control as any}
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
          control={form.control as any}
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
          control={form.control as any}
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
            control={form.control as any}
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
            control={form.control as any}
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
            control={form.control as any}
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
            control={form.control as any}
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
          control={form.control as any}
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
          control={form.control as any}
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

        <FormField
          control={form.control as any}
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
          control={form.control as any}
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

        <div className="flex flex-col gap-4">
          <FormField
            control={form.control as any}
            name="availableWeekends"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t('fields.availableWeekends')}</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="availableNights"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t('fields.availableNights')}</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('submitting') : t('register')}
        </Button>
      </form>
    </Form>
  );
}
