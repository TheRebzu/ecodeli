'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { totpChallengeSchema, TotpChallengeSchemaType } from '@/schemas/auth/login.schema';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

interface TwoFactorChallengeProps {
  email: string;
  password: string;
  callbackUrl?: string;
}

export default function TwoFactorChallenge({
  email,
  password,
  callbackUrl = '/dashboard',
}: TwoFactorChallengeProps) {
  const t = useTranslations('auth.twoFactorChallenge');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine any error from the URL
  useEffect(() => {
    const errorMessage = searchParams.get('error');
    if (errorMessage === 'CredentialsSignin') {
      setError(t('errors.invalidCode'));
    }
  }, [searchParams, t]);

  const form = useForm<TotpChallengeSchemaType>({
    resolver: zodResolver(totpChallengeSchema),
    defaultValues: {
      totp: '',
      remember: false,
    },
  });

  const onSubmit = async (data: TotpChallengeSchemaType) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        totp: data.totp,
        remember: data.remember,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(t('errors.invalidCode'));
        return;
      }

      if (result?.url) {
        router.push(result.url);
      } else {
        router.push(callbackUrl);
      }
    } catch (error) {
      setError(t('errors.generic'));
      console.error('2FA error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-focus the OTP input field
  useEffect(() => {
    const inputElement = document.getElementById('totp');
    if (inputElement) {
      inputElement.focus();
    }
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="totp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('codeLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      id="totp"
                      placeholder="000000"
                      autoComplete="one-time-code"
                      maxLength={6}
                      {...field}
                      onChange={e => {
                        // Only allow digits and limit to 6 characters
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        field.onChange(value);
                      }}
                      className="text-center text-xl tracking-widest font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">{t('rememberMe')}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || form.watch('totp').length !== 6}
            >
              {isLoading ? t('verifying') : t('verify')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col text-center text-sm text-muted-foreground">
        <p>{t('helpText')}</p>
      </CardFooter>
    </Card>
  );
}
