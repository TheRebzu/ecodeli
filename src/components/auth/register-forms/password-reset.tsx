"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";

// Schéma de validation
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function PasswordReset() {
  const { resetPassword } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const token = searchParams.get("token");
  
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  
  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError("Token manquant. Veuillez utiliser le lien fourni dans l&apos;email de réinitialisation ou demander un nouveau lien.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await resetPassword(token, data.password);
      setIsSuccess(true);
      toast({
        title: "Succès",
        description: "Votre mot de passe a été réinitialisé avec succès.",
        variant: "default",
      });
    } catch (err) {
      console.error("Erreur lors de la réinitialisation du mot de passe:", err);
      setError(
        err instanceof Error 
          ? err.message 
          : "Une erreur s&apos;est produite lors de la réinitialisation de votre mot de passe. Veuillez réessayer."
      );
      toast({
        title: "Erreur",
        description: "Une erreur s&apos;est produite lors de la réinitialisation de votre mot de passe.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Réinitialisation de mot de passe</CardTitle>
          <CardDescription>Erreur de token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
            Token manquant. Veuillez utiliser le lien fourni dans l&apos;email de réinitialisation ou demander un nouveau lien.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Mot de passe réinitialisé</CardTitle>
          <CardDescription>Votre mot de passe a été mis à jour avec succès</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="rounded-full bg-green-100 p-3 w-12 h-12 mx-auto flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-700" />
          </div>
          <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" variant="default" asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Réinitialisation de mot de passe</CardTitle>
        <CardDescription>Entrez votre nouveau mot de passe ci-dessous</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="password" 
                        className="pl-8" 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </div>
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
                  <FormLabel>Confirmer le mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="password" 
                        className="pl-8" 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="text-xs">
              <p className="font-medium mb-1">Le mot de passe doit contenir au moins :</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>8 caractères</li>
                <li>Une lettre majuscule</li>
                <li>Une lettre minuscule</li>
                <li>Un chiffre</li>
                <li>Un caractère spécial (@$!%*?&)</li>
              </ul>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation en cours...
                </>
              ) : (
                "Réinitialiser le mot de passe"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 