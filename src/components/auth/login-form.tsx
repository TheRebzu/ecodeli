'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { loginSchema, type LoginSchemaType } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, KeyRound, MailIcon } from 'lucide-react';
import AppLink from '@/components/shared/app-link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';
import { getAuthErrorMessage } from '@/lib/auth/auth-error';
import { signIn } from 'next-auth/react';

export function LoginForm({ locale = 'fr' }: { locale?: string }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState<string | null>(null);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const { login, error: authError, isLoading: authLoading, resendEmailVerification } = useAuth();
  const { toast: _toast } = useToast();
  const tAuth = useTranslations('auth');

  // Vérifier si l'erreur est liée à un email non vérifié
  const isEmailNotVerifiedError = (error: string | null) => {
    if (!error) return false;

    // Vérifier les différents cas possibles
    return (
      error === 'EmailNotVerified' ||
      error.includes('EmailNotVerified') ||
      error.includes('vérifier votre email') ||
      error.includes('Veuillez vérifier votre email') ||
      error === tAuth('errors.EmailNotVerified')
    );
  };

  // @ts-ignore: Le cast en 'any' est nécessaire en raison d'incompatibilités
  // de types entre Zod, react-hook-form et les props attendues.
  // Voir: https://github.com/react-hook-form/resolvers/issues/271
  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      totp: '',
      remember: false,
    },
  });

  // Surveiller le champ email pour afficher/masquer les options de renvoi d'email
  const watchEmail = form.watch('email');

  // Vérifier si l'erreur actuelle est liée à un email non vérifié
  useEffect(() => {
    if (isEmailNotVerifiedError(authError)) {
      const emailValue = form.getValues('email');
      if (emailValue) {
        setEmailToVerify(emailValue);
      }
    }
  }, [authError, form]);

  const onSubmit: SubmitHandler<LoginSchemaType> = async values => {
    try {
      setEmailToVerify(null); // Réinitialiser l'état du formulaire
      const result = await login(values, callbackUrl);

      if (!result) {
        // Si la connexion échoue mais nécessite 2FA
        if (
          authError?.includes('2FA') ||
          authError?.includes('TOTP') ||
          authError?.includes('facteur')
        ) {
          setShowTwoFactor(true);
          _toast({
            title: tAuth('notifications.twoFactorRequired'),
            variant: 'default',
          });
          return;
        }

        // Si l'erreur est que l'email n'est pas vérifié
        if (isEmailNotVerifiedError(authError)) {
          setEmailToVerify(values.email);
        }
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!emailToVerify) return;

    setIsResendingEmail(true);
    try {
      await resendEmailVerification(emailToVerify);
      _toast({
        title: tAuth('login.verificationEmailSent'),
        variant: 'default',
      });
    } catch (error) {
      console.error("Erreur lors du renvoi de l'email de vérification:", error);
      _toast({
        title: tAuth('login.verificationEmailError'),
        variant: 'destructive',
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{tAuth('login.title')}</CardTitle>
        <CardDescription>{tAuth('login.connectToAccount')}</CardDescription>
      </CardHeader>
      <CardContent>
        {authError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{getAuthErrorMessage(authError, key => tAuth(key))}</AlertDescription>

            {isEmailNotVerifiedError(authError) && emailToVerify && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleResendVerificationEmail}
                disabled={isResendingEmail}
              >
                {isResendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MailIcon className="mr-2 h-4 w-4" />
                )}
                {tAuth('login.resendVerificationEmail')}
              </Button>
            )}
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!showTwoFactor ? (
              <>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tAuth('login.email')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your@email.com"
                          type="email"
                          autoComplete="email"
                          disabled={authLoading}
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
                      <FormLabel>{tAuth('login.password')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          autoComplete="current-password"
                          disabled={authLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={authLoading}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          {tAuth('login.rememberMe')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <AppLink
                    href="/forgot-password"
                    locale={locale}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {tAuth('login.forgotPassword')}
                  </AppLink>
                </div>
              </>
            ) : (
              <FormField
                control={form.control}
                name="totp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tAuth('login.2fa.codeLabel')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={tAuth('login.2fa.codePlaceholder')}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          disabled={authLoading}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground mt-2">
                      {tAuth('login.2fa.enterCode')}
                    </p>
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {showTwoFactor ? tAuth('login.2fa.verifyButton') : tAuth('login.signIn')}
            </Button>
          </form>
        </Form>

        {/* Bouton dédié pour renvoyer l'email de vérification - uniquement pour les emails non vérifiés */}
        {emailToVerify && isEmailNotVerifiedError(authError) && (
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{tAuth('login.or')}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {tAuth('login.2fa.verificationEmailInfo')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleResendVerificationEmail}
                disabled={isResendingEmail}
              >
                {isResendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MailIcon className="mr-2 h-4 w-4" />
                )}
                {tAuth('login.resendVerificationEmail')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">
              {tAuth('login.continueWith')}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              signIn('google', { callbackUrl: callbackUrl || '/' });
            }}
            disabled={authLoading}
          >
            {authLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
            )}
            Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              signIn('github', { callbackUrl: callbackUrl || '/' });
            }}
            disabled={authLoading}
          >
            {authLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  fill="currentColor"
                />
              </svg>
            )}
            GitHub
          </Button>
        </div>
        <p className="text-center mt-4 text-sm">
          {tAuth('login.noAccount')}{' '}
          <AppLink
            href="/register"
            locale={locale}
            className="font-medium text-primary hover:underline"
          >
            {tAuth('login.register')}
          </AppLink>
        </p>
      </CardFooter>
    </Card>
  );
}
