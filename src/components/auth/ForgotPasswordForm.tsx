"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Veuillez entrer un email valide"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");

  // Grace period to prevent spam
  const [canResend, setCanResend] = useState<boolean>(true);
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Add timer functionality for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!canResend && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [canResend, resendTimer]);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const startResendTimer = () => {
    setCanResend(false);
    setResendTimer(60); // 60 seconds cooldown
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Mock API call for password reset
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setEmail(data.email);
      setIsEmailSent(true);
      startResendTimer();
      
      toast.success("Email de réinitialisation envoyé avec succès!");
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("Impossible d'envoyer l'email de réinitialisation. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!canResend || isLoading) return;
    
    setIsLoading(true);
    try {
      // Mock API call for resending password reset
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      startResendTimer();
      
      toast.success("Un nouvel email de réinitialisation a été envoyé!");
    } catch (error) {
      console.error("Error resending reset email:", error);
      toast.error("Impossible d'envoyer l'email de réinitialisation. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Email envoyé</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Un email de réinitialisation a été envoyé à <strong>{email}</strong>. 
                  Veuillez vérifier votre boîte de réception et suivre les instructions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Si vous n'avez pas reçu l'email, veuillez vérifier votre dossier spam ou essayez de renvoyer l'email.
          </p>
          
          <Button
            onClick={handleResendEmail}
            disabled={!canResend || isLoading}
            variant="outline"
            className="w-full h-11 sm:h-12 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : resendTimer > 0 ? (
              `Renvoyer l'email (${resendTimer}s)`
            ) : (
              "Renvoyer l'email"
            )}
          </Button>
          
          <Link
            href="/login"
            className="block text-sm font-medium text-primary hover:underline mt-6"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Mot de passe oublié ?</h2>
        <p className="text-sm text-muted-foreground">
          Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="votre@email.com" 
                    type="email" 
                    className="h-11"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-11 sm:h-12 text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Réinitialiser le mot de passe"
            )}
          </Button>
        </form>
      </Form>
      
      <div className="text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
} 