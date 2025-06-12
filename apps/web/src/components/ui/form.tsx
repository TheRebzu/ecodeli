'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';

import { cn } from '@/lib/utils/common';
import { Label } from '@/components/ui/label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

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
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

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
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};


// Composant AnnouncementForm pour les formulaires d'annonces
export function AnnouncementForm({ 
  onSubmit, 
  children, 
  ...props 
}: { 
  onSubmit: (data: any) => void; 
  children: React.ReactNode; 
} & React.ComponentProps<'form'>) {
  return (
    <form onSubmit={onSubmit} {...props}>
      {children}
    </form>
  );
}

// Export par défaut pour compatibilité
export default AnnouncementForm;


// Export ajouté automatiquement
import { Form } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';

// Composants de formulaires de profil
export function ClientProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire client */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function DelivererProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire livreur */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function MerchantProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire marchand */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function MerchantVerificationForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire de vérification marchand */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function ProviderVerificationForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire de vérification prestataire */}
        </Form>
      </CardContent>
    </Card>
  );
}

// ... existing code ...