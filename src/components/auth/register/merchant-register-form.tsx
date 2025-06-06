'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  merchantRegisterSchema,
  MerchantRegisterSchemaType,
} from '@/schemas/merchant/merchant-register.schema';
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
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

export default function MerchantRegisterForm() {
  const router = useRouter();
  const t = useTranslations('auth.register');
  const { toast } = useToast();

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      toast({
        title: t('success.title'),
        description: t('success.merchant'),
      });
      router.push('/login?registered=true&role=merchant');
    },
    onError: error => {
      toast({
        title: t('error.title'),
        description: error.message || t('error.description'),
        variant: 'destructive',
      });
    },
  });

  const form = useForm<MerchantRegisterSchemaType>({
    resolver: zodResolver(merchantRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phoneNumber: '',
      companyName: '',
      companyEmail: '',
      companyPhone: '',
      address: '',
      city: '',
      postalCode: '',
      siret: '',
      businessType: '',
      description: '',
      role: UserRole.MERCHANT,
    },
  });

  async function onSubmit(data: MerchantRegisterSchemaType) {
    try {
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        name: data.name,
        role: 'MERCHANT',
        phone: data.phoneNumber,
        companyName: data.companyName,
        address: data.address,
      });
    } catch (error) {
      // L'erreur est déjà gérée par onError
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
            name="phoneNumber"
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
                    <Input
                      type="password"
                      placeholder={t('placeholders.confirmPassword')}
                      {...field}
                    />
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

          <FormField
            control={form.control as any}
            name="companyEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.companyEmail')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('placeholders.companyEmail')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="companyPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.companyPhone')}</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder={t('placeholders.companyPhone')} {...field} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="siret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.siret')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholders.siret')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('sections.description')}</h3>

          <FormField
            control={form.control as any}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.description')}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t('placeholders.description')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">{t('verificationNotice')}</p>
          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? t('submitting') : t('registerAsMerchant')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
