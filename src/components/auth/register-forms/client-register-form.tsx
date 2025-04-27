import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { useTranslations } from 'next-intl';
import { useAuth } from '~/hooks/use-auth';
import { clientRegisterSchema } from '~/schemas/auth/user.schema';

export default function ClientRegisterForm() {
  const t = useTranslations('auth.register');
  const router = useRouter();
  const { registerClient, isLoading, error } = useAuth();
  const [formError, setFormError] = useState<string | null>(error);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const form = useForm<z.infer<typeof clientRegisterSchema>>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: {
      role: 'CLIENT',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      address: '',
      phone: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof clientRegisterSchema>) => {
    setFormError(null);
    const success = await registerClient(data);

    if (success) {
      form.reset();
      setShowSuccessMessage(true);
      // Redirection vers la page de vérification d'email
      setTimeout(() => {
        router.push('/verify-email');
      }, 3000);
    } else if (error) {
      setFormError(error);
    }
  };

  if (showSuccessMessage) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t('success.title')}</CardTitle>
          <CardDescription>{t('success.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">{t('success.checkEmail')}</p>
          <p className="text-center text-sm text-muted-foreground">{t('success.redirecting')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('client.title')}</CardTitle>
        <CardDescription>{t('client.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholders.name')} disabled={isLoading} {...field} />
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
                    <Input
                      placeholder={t('placeholders.email')}
                      type="email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.password')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholders.password')}
                      type="password"
                      disabled={isLoading}
                      {...field}
                    />
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
                    <Input
                      placeholder={t('placeholders.confirmPassword')}
                      type="password"
                      disabled={isLoading}
                      {...field}
                    />
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
                    <Input
                      placeholder={t('placeholders.address')}
                      disabled={isLoading}
                      {...field}
                    />
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
                    <Input
                      placeholder={t('placeholders.phone')}
                      type="tel"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('loading') : t('client.register')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('login')}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
