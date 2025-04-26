"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProviderRegisterSchemaType, providerRegisterSchema } from "@/schemas/auth/provider-register.schema";
import { UserRole } from "@/schemas/auth/register.schema";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export function ProviderRegisterForm() {
  const t = useTranslations('Auth.Register.Provider');
  const router = useRouter();
  const { registerProvider } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProviderRegisterSchemaType>({
    resolver: zodResolver(providerRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      serviceType: "",
      description: "",
      role: UserRole.PROVIDER,
    },
  });

  const onSubmit = async (data: ProviderRegisterSchemaType) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerProvider(data);

      if (result.success) {
        setSuccess(true);
        // Rediriger vers la page de vérification d'email
        setTimeout(() => {
          router.push("/fr/verify-email?email=" + encodeURIComponent(data.email));
        }, 2000);
      } else {
        setError(result.error as string || t('error.generic'));
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
            <AlertDescription>
              {t('success.message')}
            </AlertDescription>
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
                {...register("name")}
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
                {...register("email")}
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
                {...register("password")}
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
                {...register("confirmPassword")}
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
                {...register("phoneNumber")}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">{errors.phoneNumber.message?.toString()}</p>
              )}
            </div>

            {/* Adresse */}
            <div className="space-y-2 md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold">{t('addressInfo')}</h3>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">{t('addressLabel')}</Label>
              <Input 
                id="address"
                type="text"
                autoComplete="street-address"
                disabled={isSubmitting}
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t('cityLabel')}</Label>
              <Input 
                id="city"
                type="text"
                autoComplete="address-level2"
                disabled={isSubmitting}
                {...register("city")}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">{t('stateLabel')}</Label>
              <Input 
                id="state"
                type="text"
                autoComplete="address-level1"
                disabled={isSubmitting}
                {...register("state")}
              />
              {errors.state && (
                <p className="text-sm text-red-500">{errors.state.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">{t('postalCodeLabel')}</Label>
              <Input 
                id="postalCode"
                type="text"
                autoComplete="postal-code"
                disabled={isSubmitting}
                {...register("postalCode")}
              />
              {errors.postalCode && (
                <p className="text-sm text-red-500">{errors.postalCode.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t('countryLabel')}</Label>
              <Input 
                id="country"
                type="text"
                autoComplete="country-name"
                disabled={isSubmitting}
                {...register("country")}
              />
              {errors.country && (
                <p className="text-sm text-red-500">{errors.country.message?.toString()}</p>
              )}
            </div>

            {/* Informations prestataire */}
            <div className="space-y-2 md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold">{t('providerInfo')}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">{t('serviceTypeLabel')}</Label>
              <Select 
                onValueChange={(value) => setValue("serviceType", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder={t('selectServiceType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAINTENANCE">{t('serviceTypes.maintenance')}</SelectItem>
                  <SelectItem value="CLEANING">{t('serviceTypes.cleaning')}</SelectItem>
                  <SelectItem value="REPAIR">{t('serviceTypes.repair')}</SelectItem>
                  <SelectItem value="INSTALLATION">{t('serviceTypes.installation')}</SelectItem>
                  <SelectItem value="CONSULTING">{t('serviceTypes.consulting')}</SelectItem>
                  <SelectItem value="OTHER">{t('serviceTypes.other')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.serviceType && (
                <p className="text-sm text-red-500">{errors.serviceType.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">{t('descriptionLabel')}</Label>
              <Textarea 
                id="description"
                rows={4}
                disabled={isSubmitting}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message?.toString()}</p>
              )}
            </div>
          </div>

          <div className="md:col-span-2 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('certificationsInfo')}
            </p>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
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
