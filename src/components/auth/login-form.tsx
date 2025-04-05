"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { LoginFormData, UserRole, loginSchema } from "@/lib/validations/auth";
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
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const { signIn: useAuthSignIn, signInWithGoogle, signInWithFacebook } = useAuth();

  // Get query params for registration success and role
  const registered = searchParams.get("registered");
  const role = searchParams.get("role");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const getRedirectPath = (userRole: string): string => {
    switch (userRole.toUpperCase() as UserRole) {
      case "CLIENT":
        return "/client/dashboard";
      case "LIVREUR":
        return "/livreur/dashboard";
      case "COMMERCANT":
        return "/commercant/dashboard";
      case "PRESTATAIRE":
        return "/prestataire/dashboard";
      default:
        return "/dashboard";
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const success = await useAuthSignIn(data.email, data.password);
      if (success) {
        router.push("/dashboard");
        toast.success("Connexion réussie !");
      }
    } catch (error) {
      toast.error("Erreur lors de la connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: "google" | "facebook") => {
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithFacebook();
      }
      router.push("/dashboard");
      toast.success("Connexion réussie !");
    } catch (error) {
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
                <FormLabel className="text-base">Mot de passe</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    className="h-11"
                    disabled={isLoading}
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
                      disabled={isLoading}
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
            disabled={isLoading}
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
        >
          <Icons.google className="mr-2 h-5 w-5" />
          Continuer avec Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 sm:h-12 text-base"
          onClick={() => handleSocialSignIn("facebook")}
        >
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