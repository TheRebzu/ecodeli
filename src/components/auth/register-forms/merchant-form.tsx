'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  MerchantRegisterSchemaType,
  merchantRegisterSchema,
} from '@/schemas/auth/merchant-register.schema';
import { UserRole } from '@/schemas/auth/register.schema';
import { Textarea } from '@/components/ui/textarea';

export function MerchantRegistrationForm() {
  const t = useTranslations('Auth.Register.Merchant');
  const router = useRouter();
  const { registerMerchant } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MerchantRegisterSchemaType>({
    resolver: zodResolver(merchantRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phoneNumber: '',
      businessName: '',
      siret: '',
      taxId: '',
      businessAddress: '',
      businessCity: '',
      businessState: '',
      businessPostal: '',
      businessCountry: '',
      businessDescription: '',
      role: UserRole.MERCHANT,
    },
  });

  const onSubmit = async (data: MerchantRegisterSchemaType) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerMerchant(data);

      if (result.success) {
        setSuccess(true);
        // Rediriger vers la page de vérification d'email
        setTimeout(() => {
          router.push('/fr/verify-email?email=' + encodeURIComponent(data.email));
        }, 2000);
      } else {
        setError((result.error as string) || t('error.generic'));
      }
    } catch (err) {
      setError(t('error.generic'));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t('success.title')}</CardTitle>
          <CardDescription>{t('success.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription>{t('success.message')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Informations personnelles */}
            <div className="space-y-2 md:col-span-2">
              <h3 className="text-lg font-semibold">{t('personalInfo')}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('nameLabel')}</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                disabled={isSubmitting}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isSubmitting}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t('phoneLabel')}</Label>
              <Input
                id="phoneNumber"
                type="tel"
                autoComplete="tel"
                disabled={isSubmitting}
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">{errors.phoneNumber.message?.toString()}</p>
              )}
            </div>

            {/* Informations de l'entreprise */}
            <div className="space-y-2 md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold">{t('businessInfo')}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">{t('businessNameLabel')}</Label>
              <Input
                id="businessName"
                type="text"
                autoComplete="organization"
                disabled={isSubmitting}
                {...register('businessName')}
              />
              {errors.businessName && (
                <p className="text-sm text-red-500">{errors.businessName.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="siret">{t('siretLabel')}</Label>
              <Input id="siret" type="text" disabled={isSubmitting} {...register('siret')} />
              {errors.siret && (
                <p className="text-sm text-red-500">{errors.siret.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">{t('taxIdLabel')}</Label>
              <Input id="taxId" type="text" disabled={isSubmitting} {...register('taxId')} />
              {errors.taxId && (
                <p className="text-sm text-red-500">{errors.taxId.message?.toString()}</p>
              )}
            </div>

            {/* Adresse professionnelle */}
            <div className="space-y-2 md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold">{t('addressInfo')}</h3>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessAddress">{t('businessAddressLabel')}</Label>
              <Input
                id="businessAddress"
                type="text"
                autoComplete="street-address"
                disabled={isSubmitting}
                {...register('businessAddress')}
              />
              {errors.businessAddress && (
                <p className="text-sm text-red-500">{errors.businessAddress.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessCity">{t('businessCityLabel')}</Label>
              <Input
                id="businessCity"
                type="text"
                autoComplete="address-level2"
                disabled={isSubmitting}
                {...register('businessCity')}
              />
              {errors.businessCity && (
                <p className="text-sm text-red-500">{errors.businessCity.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessState">{t('businessStateLabel')}</Label>
              <Input
                id="businessState"
                type="text"
                autoComplete="address-level1"
                disabled={isSubmitting}
                {...register('businessState')}
              />
              {errors.businessState && (
                <p className="text-sm text-red-500">{errors.businessState.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessPostal">{t('businessPostalLabel')}</Label>
              <Input
                id="businessPostal"
                type="text"
                autoComplete="postal-code"
                disabled={isSubmitting}
                {...register('businessPostal')}
              />
              {errors.businessPostal && (
                <p className="text-sm text-red-500">{errors.businessPostal.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessCountry">{t('businessCountryLabel')}</Label>
              <Input
                id="businessCountry"
                type="text"
                autoComplete="country-name"
                disabled={isSubmitting}
                {...register('businessCountry')}
              />
              {errors.businessCountry && (
                <p className="text-sm text-red-500">{errors.businessCountry.message?.toString()}</p>
              )}
            </div>

            {/* Description de l'entreprise */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessDescription">{t('businessDescriptionLabel')}</Label>
              <Textarea
                id="businessDescription"
                disabled={isSubmitting}
                {...register('businessDescription')}
                rows={4}
              />
              {errors.businessDescription && (
                <p className="text-sm text-red-500">
                  {errors.businessDescription.message?.toString()}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="websiteUrl">{t('websiteUrlLabel')}</Label>
              <Input
                id="websiteUrl"
                type="url"
                autoComplete="url"
                disabled={isSubmitting}
                {...register('websiteUrl')}
              />
              {errors.websiteUrl && (
                <p className="text-sm text-red-500">{errors.websiteUrl.message?.toString()}</p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </div>

          <div className="text-sm text-center mt-4">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('login')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
