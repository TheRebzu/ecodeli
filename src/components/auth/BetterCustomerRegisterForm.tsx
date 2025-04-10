"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";

import { clientRegisterSchema, UserRoleEnum } from "@/lib/validations/auth";
import { useBetterAuth } from "@/hooks/use-better-auth";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";

export function BetterCustomerRegisterForm() {
  const router = useRouter();
  const { register } = useBetterAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: UserRoleEnum.enum.CLIENT,
      termsAccepted: false,
    },
    mode: "onChange",
  });
  
  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const result = await register(data, "client");
      
      if (!result.success) {
        toast.error(result.error || "Erreur d'inscription");
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center mb-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push("/register")}
            className="mr-2"
          >
            <Icons.arrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Inscription Client</CardTitle>
        </div>
        <CardDescription>
          Créez votre compte client pour commander et être livré de façon écologique
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Alert variant="info" className="mb-6">
          <Icons.info className="h-4 w-4" />
          <AlertDescription>
            En tant que client, vous pourrez accéder à votre compte immédiatement après confirmation de votre adresse email.
          </AlertDescription>
        </Alert>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="jean.dupont@exemple.com" 
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
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="0612345678" 
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
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="********" {...field} />
                    </FormControl>
                    <FormDescription>
                      Au moins 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
                    </FormDescription>
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
                      <PasswordInput placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>J'accepte les conditions générales d'utilisation</FormLabel>
                      <FormDescription>
                        En cochant cette case, vous acceptez nos{" "}
                        <Link href="/terms" className="text-primary hover:underline">
                          conditions générales d'utilisation
                        </Link>{" "}
                        et notre{" "}
                        <Link href="/privacy" className="text-primary hover:underline">
                          politique de confidentialité
                        </Link>.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              S'inscrire
            </Button>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex justify-center">
        <div className="text-sm text-muted-foreground">
          Vous avez déjà un compte?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Se connecter
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
