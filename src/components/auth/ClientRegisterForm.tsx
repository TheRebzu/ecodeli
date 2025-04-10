"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { UserRole } from "@/lib/auth-utils";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";

// Schema de validation client
const UserRoleEnum = z.enum(["ADMIN", "CLIENT", "COURIER", "MERCHANT", "PROVIDER"]);

const clientRegisterSchema = z.object({
  firstName: z.string().min(2, { message: "Le prénom doit contenir au moins 2 caractères" }),
  lastName: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Email invalide" }),
  phone: z.string().optional(),
  password: z.string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" })
    .regex(/[^A-Za-z0-9]/, { message: "Le mot de passe doit contenir au moins un caractère spécial" }),
  confirmPassword: z.string(),
  role: z.literal(UserRoleEnum.enum.CLIENT),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les conditions générales"
  }),
}).refine(
  (data) => data.password === data.confirmPassword, 
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  }
);

type ClientRegisterFormData = z.infer<typeof clientRegisterSchema>;

interface ClientRegisterFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ClientRegisterForm({ className, ...props }: ClientRegisterFormProps) {
  const router = useRouter();
  const { registerClient } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [savedFormData, setSavedFormData] = useState<Partial<ClientRegisterFormData>>({});

  // Initialize form with React Hook Form and Zod
  const form = useForm<ClientRegisterFormData>({
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
      ...savedFormData,
    },
    mode: "onChange",
  });

  // Load saved form data
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('clientRegisterFormProgress');
      if (savedProgress) {
        const parsedData = JSON.parse(savedProgress);
        setSavedFormData(parsedData);
        form.reset({
          ...form.getValues(),
          ...parsedData
        });
      }
    } catch (error) {
      console.error('Error loading saved form progress', error);
    }
  }, [form]);

  // Save form progress
  const saveFormProgress = () => {
    try {
      const currentValues = form.getValues();
      localStorage.setItem('clientRegisterFormProgress', JSON.stringify(currentValues));
    } catch (error) {
      console.error('Error saving form progress', error);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ClientRegisterFormData) => {
    setIsLoading(true);
    
    try {
      // Use useAuth hook for registration
      const result = await registerClient({
        ...data,
        role: UserRole.CLIENT,
        acceptTerms: data.termsAccepted
      });
      
      if (result.success) {
        // Remove saved data after successful registration
        localStorage.removeItem('clientRegisterFormProgress');
        
        // Redirect to verification page or login page
        toast.success("Inscription réussie ! Vous pouvez maintenant vous connecter.");
        router.push("/login?registered=true&role=client");
      } else {
        toast.error(result.error || "Erreur lors de l'inscription. Veuillez réessayer.");
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de l'inscription. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("bg-card border rounded-lg p-6 shadow-sm", className)} {...props}>
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/register")}
          className="mr-2"
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-xl font-semibold">Inscription Client</div>
      </div>
      
      <Alert className="mb-6">
        <Icons.info className="h-4 w-4" />
        <AlertDescription>
          En tant que client, vous pourrez accéder à votre compte immédiatement après confirmation de votre adresse email.
        </AlertDescription>
      </Alert>
      
      <Form {...form}>
        <form 
          className="space-y-6" 
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={saveFormProgress}
        >
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Informations personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} autoComplete="given-name" />
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
                      <Input placeholder="Dupont" {...field} autoComplete="family-name" />
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
                      autoComplete="email"
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
                      autoComplete="tel"
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
                    <PasswordInput 
                      placeholder="••••••••" 
                      {...field} 
                      autoComplete="new-password"
                      id="password-field"
                    />
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
                    <PasswordInput
                      placeholder="••••••••" 
                      {...field} 
                      autoComplete="new-password"
                      id="confirm-password-field"
                    />
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
                      </Link>
                      .
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            S'inscrire
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground mt-6">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
} 