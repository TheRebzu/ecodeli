"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { loginSchema } from "@/lib/validations/auth";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";
import { z } from "zod";

// Définir le type directement ici pour éviter les problèmes d'importation
type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // Get query params for registration success and role
  const registered = searchParams.get("registered");
  const role = searchParams.get("role");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");
  const fromAuth = searchParams.get("fromAuth") === "1";
  
  // Analyser l'URL de callback pour déterminer la destination finale
  const extractDestination = (url: string): string => {
    try {
      // Si c'est une URL complète, extraire le pathname
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        return urlObj.pathname;
      }
      // Sinon, retourner telle quelle
      return url;
    } catch (e) {
      return "/dashboard";
    }
  };
  
  const finalDestination = extractDestination(callbackUrl);
  console.log(`[login] Destination finale: ${finalDestination}`);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Timer countdown for account lock
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const interval = setInterval(() => {
        setLockTimer((prev) => prev - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (isLocked && lockTimer === 0) {
      setIsLocked(false);
      setLoginAttempts(0);
    }
  }, [isLocked, lockTimer]);

  const getRedirectPath = (userRole: string): string => {
    switch (userRole.toUpperCase()) {
      case "CLIENT":
        return "/client/dashboard";
      case "COURIER":
        return "/courier/dashboard";
      case "MERCHANT":
        return "/merchant/dashboard";
      case "PROVIDER":
        return "/provider/dashboard";
      case "ADMIN":
        return "/admin/dashboard";
      default:
        return "/dashboard";
    }
  };

  const onSubmit = async (values: LoginFormData) => {
    if (isLocked) {
      toast.error(`Compte temporairement bloqué. Réessayez dans ${lockTimer} secondes.`);
      return;
    }

    setIsLoading(true);
    try {
      // Appel à l'API de connexion avec les informations du formulaire
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: callbackUrl || "/dashboard" // Rediriger vers le dashboard générique si pas de callbackUrl
      });
      
      if (!result?.ok) {
        // Increment login attempts on failure
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Lock account temporarily after 5 failed attempts
        if (newAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(60); // 60 second lockout
          toast.error("Trop de tentatives échouées. Compte temporairement bloqué pour 60 secondes.");
        } else {
          toast.error("Identifiants incorrects. Veuillez réessayer.");
        }
        
        setIsLoading(false);
        return;
      }
      
      // Reset login attempts on success
      setLoginAttempts(0);
      
      toast.success("Connexion réussie !");
      
      // La redirection sera gérée directement avec window.location
      // pour être sûr que la page est complètement rechargée
      // et que la session est correctement établie
      setTimeout(() => {
        // Utiliser à la fois URL.createObjectURL et document.createElement
        // pour forcer une redirection complète avec rechargement
        const redirectTarget = result.url || callbackUrl || "/dashboard";
        console.log("[login] Redirection vers:", redirectTarget);
        
        try {
          // Approche 1: Utiliser un form et le soumettre pour forcer le rechargement
          const form = document.createElement('form');
          form.method = 'GET';
          form.action = redirectTarget;
          document.body.appendChild(form);
          form.submit();
        } catch (e) {
          // Fallback: redirection directe
          window.location.href = redirectTarget;
        }
      }, 1200); // Délai encore plus long pour s'assurer que la session est établie
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      toast.error("Erreur lors de la connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = (provider: "google" | "facebook") => {
    if (isLocked) {
      toast.error(`Compte temporairement bloqué. Réessayez dans ${lockTimer} secondes.`);
      return;
    }

    try {
      // Appel direct à signIn pour éviter les erreurs asynchrones
      signIn(provider, { callbackUrl });
    } catch (error) {
      console.error("Erreur lors de la connexion sociale:", error);
      toast.error("Erreur lors de la connexion. Veuillez réessayer.");
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {registered && (
        <Alert className="bg-green-50 border-green-200 mb-6">
          <AlertDescription>
            {`Votre compte ${role ? `de ${role}` : ""} a été créé avec succès. Vous pouvez maintenant vous connecter.`}
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert className="bg-red-50 border-red-200 mb-6">
          <AlertDescription>
            {error === "CredentialsSignin" 
              ? "Identifiants incorrects. Veuillez réessayer." 
              : "Une erreur est survenue lors de la connexion. Veuillez réessayer."}
          </AlertDescription>
        </Alert>
      )}
      
      {isLocked && (
        <Alert className="bg-amber-50 border-amber-200 mb-6">
          <AlertDescription>
            {`Compte temporairement bloqué suite à de multiples échecs. Réessayez dans ${lockTimer} secondes.`}
          </AlertDescription>
        </Alert>
      )}
      
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
                    placeholder="nom@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    className="h-11"
                    disabled={isLoading || isLocked}
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
                <FormLabel className="text-base">Mot de passe</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="••••••••"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    className="h-11"
                    disabled={isLoading || isLocked}
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
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading || isLocked}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    Se souvenir de moi
                  </FormLabel>
                </FormItem>
              )}
            />
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Mot de passe oublié?
            </Link>
          </div>
          <Button 
            type="submit" 
            className="w-full h-11 sm:h-12 text-base" 
            disabled={isLoading || isLocked}
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Se connecter
          </Button>
        </form>
      </Form>
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-muted-foreground text-sm">
            Ou continuer avec
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 sm:h-12 text-base"
          onClick={() => handleSocialSignIn("google")}
          disabled={isLoading || isLocked}
        >
          {isLoading && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Icons.google className="mr-2 h-5 w-5" />
          Continuer avec Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 sm:h-12 text-base"
          onClick={() => handleSocialSignIn("facebook")}
          disabled={isLoading || isLocked}
        >
          {isLoading && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Icons.facebook className="mr-2 h-5 w-5" />
          Continuer avec Facebook
        </Button>
      </div>
      <div className="text-center text-sm mt-8">
        Pas encore de compte?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          S&apos;inscrire
        </Link>
      </div>
    </div>
  );
} 