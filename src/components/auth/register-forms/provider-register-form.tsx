'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  providerRegisterSchema,
  ProviderRegisterSchemaType,
  ServiceType
} from '@/schemas/auth/provider-register.schema';
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
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';

type ProviderRegisterFormProps = {
  locale: string;
};

export default function ProviderRegisterForm({ locale }: ProviderRegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth.register');
  
  // Options pour les services
  const serviceOptions = [
    { value: 'MAINTENANCE', label: t('serviceTypes.maintenance') },
    { value: 'CLEANING', label: t('serviceTypes.cleaning') },
    { value: 'REPAIR', label: t('serviceTypes.repair') },
    { value: 'INSTALLATION', label: t('serviceTypes.installation') },
    { value: 'CONSULTING', label: t('serviceTypes.consulting') },
    { value: 'OTHER', label: t('serviceTypes.other') },
  ];

  const form = useForm<ProviderRegisterSchemaType>({
    resolver: zodResolver(providerRegisterSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      companyName: '',
      address: '',
      phone: '',
      services: [],
      serviceType: undefined,
      description: '',
      availability: '',
      websiteUrl: '',
      role: UserRole.PROVIDER,
    },
  });

  async function onSubmit(data: ProviderRegisterSchemaType) {
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

      // Après l'inscription, rediriger vers la page de vérification
      router.push(`/${locale}/login?registered=true`);
    } catch (error) {
      console.error('Registration error:', error);
      // Gérer l'erreur (afficher un message toast, etc.)
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('sections.personalInfo')}</h3>
          
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('sections.professionalInfo')}</h3>
          
          <FormField
            control={form.control as any}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.companyName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.companyName')} {...field} />
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

          <FormField
            control={form.control as any}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.serviceType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('placeholders.serviceType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ServiceType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`serviceTypes.${type.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="services"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.services')}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={serviceOptions}
                    placeholder={t('placeholders.services')}
                    selected={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('placeholders.description')}
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.availability')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('placeholders.availability')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.websiteUrl')}</FormLabel>
                <FormControl>
                  <Input type="url" placeholder={t('placeholders.websiteUrl')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('verificationNotice')}
          </p>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('submitting') : t('register')}
          </Button>
        </div>
      </form>
    </Form>
  );
} 