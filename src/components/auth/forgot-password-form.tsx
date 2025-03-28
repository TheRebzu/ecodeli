"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { ResetPasswordFormData, resetPasswordSchema } from "@/lib/validations/auth";
import { AuthService } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/shared/icons";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      const result = await AuthService.requestPasswordReset(data.email);
      
      if (result.success) {
        setEmailSent(true);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Une erreur est survenue lors de l'envoi des instructions");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-3">
          <Icons.mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Vérifiez votre email</h3>
        <p className="text-sm text-muted-foreground">
          Nous avons envoyé des instructions de réinitialisation de mot de passe à votre adresse email.
        </p>
        <Button
          variant="link"
          className="mt-4"
          onClick={() => setEmailSent(false)}
        >
          Retour au formulaire
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold">Mot de passe oublié</h3>
        <p className="text-sm text-muted-foreground">
          Entrez votre email pour recevoir les instructions de réinitialisation
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="nom@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Envoyer les instructions
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm">
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
} 