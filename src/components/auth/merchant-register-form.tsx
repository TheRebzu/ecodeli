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
  UserRoleEnum 
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/shared/file-upload";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface MerchantRegisterFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function MerchantRegisterForm({ className, ...props }: MerchantRegisterFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [savedFormData, setSavedFormData] = useState<Partial<RegisterFormData>>({});

  // Initialize form with React Hook Form and Zod
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: UserRoleEnum.enum.COMMERCANT,
      storeName: "",
      storeDescription: "",
      storeAddress: "",
      storeType: "",
      siret: "",
      termsAccepted: false,
      documents: [],
      ...savedFormData,
    },
    mode: "onChange",
  });

  // Load saved form data
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('merchantRegisterFormProgress');
      if (savedProgress) {
        const parsedData = JSON.parse(savedProgress);
        setSavedFormData(parsedData);
        form.reset({
          ...form.getValues(),
          ...parsedData
        });
        
        // Restore documents
        if (parsedData.documents && Array.isArray(parsedData.documents)) {
          setUploadedDocuments(parsedData.documents);
        }
      }
    } catch (error) {
      console.error('Error loading saved form progress', error);
    }
  }, [form]);

  // Save form progress
  const saveFormProgress = () => {
    try {
      const currentValues = form.getValues();
      currentValues.documents = uploadedDocuments;
      localStorage.setItem('merchantRegisterFormProgress', JSON.stringify(currentValues));
    } catch (error) {
      console.error('Error saving form progress', error);
    }
  };

  // Handle form submission
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      // Add documents
      data.documents = uploadedDocuments;
      
      // Use useAuth hook for registration
      const success = await signUp(data);
      
      if (success) {
        // Remove saved data after successful registration
        localStorage.removeItem('merchantRegisterFormProgress');
        
        // Redirect to verification page
        router.push("/verification-pending");
        toast.success("Inscription réussie ! Votre compte est en attente de validation.");
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

  // Handle document upload
  const handleDocumentUpload = (url: string) => {
    setUploadedDocuments((prev) => {
      const newDocs = [...prev, url];
      saveFormProgress();
      return newDocs;
    });
  };

  // Remove document
  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => {
      const newDocs = prev.filter((_, i) => i !== index);
      setTimeout(() => saveFormProgress(), 0);
      return newDocs;
    });
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
        <div className="text-xl font-semibold">Inscription Commerçant</div>
      </div>
      
      <Alert className="mb-6">
        <Icons.info className="h-4 w-4" />
        <AlertDescription>
          En tant que commerçant, votre compte sera soumis à validation par notre équipe avant de pouvoir publier vos produits.
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
              <h3 className="font-medium text-lg mb-2">Informations du commerce</h3>
              
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du commerce</FormLabel>
                    <FormControl>
                      <Input placeholder="Ma Boutique Bio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="storeType"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Type de commerce</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Épicerie, Boulangerie, Restaurant, etc." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="storeDescription"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Description du commerce</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Décrivez votre commerce, vos produits, votre philosophie..." 
                        className="h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="storeAddress"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Adresse du commerce</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adresse complète du commerce" 
                        className="h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="siret"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Numéro SIRET</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678901234" {...field} />
                    </FormControl>
                    <FormDescription>
                      14 chiffres sans espaces
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-lg mb-2">Documents justificatifs</h3>
              <div className="border rounded-md p-4">
                <FileUpload
                  endpoint="merchantDocument"
                  onChange={handleDocumentUpload}
                  className="w-full"
                />
                <FormDescription className="mt-2">
                  Téléchargez les documents suivants : extrait K-bis, pièce d'identité, justificatif d'adresse...
                </FormDescription>
                
                {uploadedDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>Documents téléchargés :</Label>
                    <div className="flex flex-wrap gap-2">
                      {uploadedDocuments.map((doc, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          <Icons.file className="h-3 w-3" />
                          Document {index + 1}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => removeDocument(index)}
                            aria-label={`Supprimer le document ${index + 1}`}
                          >
                            <Icons.x className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
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
            disabled={isLoading || uploadedDocuments.length === 0}
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