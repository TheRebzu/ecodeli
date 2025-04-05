"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { 
  RegisterFormData, 
  registerSchema,
  UserRoleEnum,
  SubscriptionTypeEnum
} from "@/lib/validations/auth.schema";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

// Liste des types d'abonnement
const SUBSCRIPTION_TYPES = [
  { value: SubscriptionTypeEnum.enum.FREE, label: "Gratuit" },
  { value: SubscriptionTypeEnum.enum.STARTER, label: "Starter" },
  { value: SubscriptionTypeEnum.enum.PREMIUM, label: "Premium" },
];

interface ClientRegisterFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ClientRegisterForm({ className, ...props }: ClientRegisterFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedFormData, setSavedFormData] = useState<Partial<RegisterFormData>>({});

  // Initialiser le formulaire avec React Hook Form et Zod
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: UserRoleEnum.enum.CLIENT,
      termsAccepted: false,
      address: "",
      city: "",
      postalCode: "",
      country: "France",
      subscriptionType: SubscriptionTypeEnum.enum.FREE,
      newsletterOptIn: false,
      ...savedFormData,
    },
    mode: "onChange",
  });

  // Charger les données sauvegardées du formulaire
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

  // Sauvegarder la progression du formulaire
  const saveFormProgress = () => {
    try {
      const currentValues = form.getValues();
      localStorage.setItem('clientRegisterFormProgress', JSON.stringify(currentValues));
    } catch (error) {
      console.error('Error saving form progress', error);
    }
  };

  // Gérer la soumission du formulaire
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      // Utiliser le hook useAuth pour l'inscription
      const success = await signUp(data);
      
      if (success) {
        // Supprimer les données sauvegardées après inscription réussie
        localStorage.removeItem('clientRegisterFormProgress');
        
        // Redirection vers la page de vérification d'email
        router.push("/verify-email");
        toast.success("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");
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
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex items-center">
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
      
      <Form {...form}>
        <form 
          className="space-y-6" 
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={saveFormProgress}
        >
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
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="********" 
                        {...field} 
                        autoComplete="new-password"
                        id="password-field"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <Icons.eyeOff className="h-4 w-4" /> : <Icons.eye className="h-4 w-4" />}
                      </Button>
                    </div>
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
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="********" 
                      {...field} 
                      autoComplete="new-password"
                      id="confirm-password-field"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-2">Adresse</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 rue de la Paix" 
                          {...field} 
                          autoComplete="street-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Paris" 
                            {...field} 
                            autoComplete="address-level2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="75000" 
                            {...field} 
                            autoComplete="postal-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="France" 
                          {...field} 
                          autoComplete="country-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-2">Options</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="subscriptionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abonnement</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un abonnement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUBSCRIPTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Vous pouvez changer d'abonnement à tout moment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newsletterOptIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Recevoir la newsletter</FormLabel>
                        <FormDescription>
                          Recevez des informations sur nos offres et nouveautés
                        </FormDescription>
                      </div>
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
            </div>
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

      <div className="text-center text-sm text-muted-foreground">
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