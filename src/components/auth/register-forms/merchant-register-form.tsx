'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  merchantRegisterSchema,
  MerchantRegisterSchemaType,
} from '@/schemas/auth/merchant-register.schema';
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
import { Textarea } from '@/components/ui/textarea';

type MerchantRegisterFormProps = {
  locale: string;
};

export default function MerchantRegisterForm({ locale }: MerchantRegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth.register');

  const form = useForm<MerchantRegisterSchemaType>({
    resolver: zodResolver(merchantRegisterSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      companyName: '',
      address: '',
      phone: '',
      businessType: '',
      vatNumber: '',
      businessAddress: '',
      businessCity: '',
      businessState: '',
      businessPostal: '',
      businessCountry: '',
      taxId: '',
      websiteUrl: '',
      role: UserRole.MERCHANT,
    },
  });

  async function onSubmit(data: MerchantRegisterSchemaType) {
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
          <h3 className="text-lg font-medium">{t('sections.businessInfo')}</h3>
          
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.businessType')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholders.businessType')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="vatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.vatNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholders.vatNumber')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('sections.businessAddress')}</h3>
          
          <FormField
            control={form.control as any}
            name="businessAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.businessAddress')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.businessAddress')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="businessCity"
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
              name="businessPostal"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="businessState"
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
              name="businessCountry"
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