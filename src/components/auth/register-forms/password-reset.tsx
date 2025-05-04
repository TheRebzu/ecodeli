'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { api } from '@/trpc/react';
import { useTranslations } from 'next-intl';

// Schéma de validation pour le formulaire de réinitialisation de mot de passe
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
      .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une majuscule' })
      .regex(/[a-z]/, { message: 'Le mot de passe doit contenir au moins une minuscule' })
      .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
      .regex(/[^A-Za-z0-9]/, { message: 'Le mot de passe doit contenir au moins un caractère spécial' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function PasswordResetForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const t = useTranslations('Auth.ResetPassword');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuration du formulaire avec React Hook Form
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Mutation tRPC pour réinitialiser le mot de passe
  const resetPassword = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast({
        title: t('success.title'),
        description: t('success.description'),
        variant: 'success',
      });
      // Rediriger vers la page de connexion après réinitialisation réussie
      router.push('/login');
    },
    onError: error => {
      toast({
        title: t('error.title'),
        description: error.message || t('error.description'),
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  // Gérer la soumission du formulaire
  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!token) {
      toast({
        title: t('error.title'),
        description: t('error.invalidToken'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    resetPassword.mutate({
      token,
      password: data.password,
    });
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('password.label')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t('password.placeholder')}
                    autoComplete="new-password"
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
                <FormLabel>{t('confirmPassword.label')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t('confirmPassword.placeholder')}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              t('resetPassword')
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
} 