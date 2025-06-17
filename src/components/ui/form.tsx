"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext} from "react-hook-form";

import { cn } from "@/lib/utils/common";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState};
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField};

// Composant AnnouncementForm pour les formulaires d'annonces
export function AnnouncementForm({
  onSubmit,
  children,
  ...props
}: {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
} & React.ComponentProps<"form">) {
  return (
    <form onSubmit={onSubmit} {...props}>
      {children}
    </form>
  );
}

// Export par défaut pour compatibilité
export default AnnouncementForm;

// Export ajouté automatiquement
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Composants de formulaires de profil
export function ClientProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="text-lg font-semibold mb-4">Profil Client</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prénom</label>
              <input
                type="text"
                placeholder="Votre prénom"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nom</label>
              <input
                type="text"
                placeholder="Votre nom"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="votre@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Téléphone</label>
            <input
              type="tel"
              placeholder="+33 6 12 34 56 78"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function DelivererProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="text-lg font-semibold mb-4">Profil Livreur</div>
          <div>
            <label className="block text-sm font-medium mb-2">Type de véhicule</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionnez votre véhicule</option>
              <option value="bike">Vélo</option>
              <option value="scooter">Scooter</option>
              <option value="motorcycle">Moto</option>
              <option value="car">Voiture</option>
              <option value="van">Camionnette</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Zones de travail</label>
            <textarea
              placeholder="Listez vos zones de livraison (ex: Paris 1er, 2ème, 3ème...)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function MerchantProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="text-lg font-semibold mb-4">Profil Commerçant</div>
          <div>
            <label className="block text-sm font-medium mb-2">Nom de l'entreprise</label>
            <input
              type="text"
              placeholder="Nom de votre commerce"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">SIRET</label>
              <input
                type="text"
                placeholder="123 456 789 01234"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Catégorie</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Type de commerce</option>
                <option value="restaurant">Restaurant</option>
                <option value="grocery">Épicerie</option>
                <option value="pharmacy">Pharmacie</option>
                <option value="electronics">Électronique</option>
              </select>
            </div>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function MerchantVerificationForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="text-lg font-semibold mb-4">Vérification Commerçant</div>
          <div>
            <label className="block text-sm font-medium mb-2">Extrait Kbis (moins de 3 mois)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">Document officiel prouvant l'existence de votre entreprise</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Pièce d'identité du gérant</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderVerificationForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="text-lg font-semibold mb-4">Vérification Prestataire</div>
          <div>
            <label className="block text-sm font-medium mb-2">Pièce d'identité</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Certificat professionnel</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">Diplôme ou certification prouvant vos compétences</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Assurance responsabilité civile</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// ... existing code ...
