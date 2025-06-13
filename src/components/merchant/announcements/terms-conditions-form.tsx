"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, FileText } from "lucide-react";

// Define the form schema
const formSchema = z.object({
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions générales pour continuer",
  }),
  deliveryNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
  cancellationPolicy: z.string().default("STANDARD"),
  returnPolicy: z.string().default("STANDARD"),
  contactPreference: z.string().default("ANY"),
});

export type TermsAndConditionsData = z.infer<typeof formSchema>;

interface TermsAndConditionsFormProps {
  initialValues?: Partial<TermsAndConditionsData>;
  isSubmitting?: boolean;
  onSubmit?: (data: TermsAndConditionsData) => void;
  // Supporting props for create-announcement page
  data?: any;
  onUpdateForm?: (data: any) => void;
  isLoading?: boolean;
}

export function TermsAndConditionsForm({
  initialValues,
  isSubmitting = false,
  onSubmit,
  data,
  onUpdateForm,
  isLoading = false,
}: TermsAndConditionsFormProps) {
  const t = useTranslations("announcements.terms");

  // Use whichever prop is available
  const effectiveInitialValues = data || initialValues || {};
  const isProcessing = isSubmitting || isLoading;

  const form = useForm<TermsAndConditionsData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      termsAccepted: false,
      deliveryNotes: "",
      specialInstructions: "",
      cancellationPolicy: "STANDARD",
      returnPolicy: "STANDARD",
      contactPreference: "ANY",
      ...effectiveInitialValues,
    },
  });

  // Handle form submission based on which prop was provided
  const handleFormSubmit = (formData: TermsAndConditionsData) => {
    if (onUpdateForm) {
      onUpdateForm(formData);
    } else if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("deliveryInstructions")}</CardTitle>
            <CardDescription>
              {t("deliveryInstructionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="deliveryNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("deliveryNotes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("deliveryNotesPlaceholder")}
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("deliveryNotesDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("specialInstructions")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("specialInstructionsPlaceholder")}
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("specialInstructionsDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("policies")}</CardTitle>
            <CardDescription>{t("policiesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="cancellationPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cancellationPolicy")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("selectCancellationPolicy")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="STANDARD">
                        {t("cancellationPolicies.standard")}
                      </SelectItem>
                      <SelectItem value="FLEXIBLE">
                        {t("cancellationPolicies.flexible")}
                      </SelectItem>
                      <SelectItem value="STRICT">
                        {t("cancellationPolicies.strict")}
                      </SelectItem>
                      <SelectItem value="NON_REFUNDABLE">
                        {t("cancellationPolicies.nonRefundable")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("cancellationPolicyDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="returnPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("returnPolicy")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectReturnPolicy")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="STANDARD">
                        {t("returnPolicies.standard")}
                      </SelectItem>
                      <SelectItem value="NO_RETURN">
                        {t("returnPolicies.noReturn")}
                      </SelectItem>
                      <SelectItem value="CASE_BY_CASE">
                        {t("returnPolicies.caseByCase")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("returnPolicyDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contactPreference")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("selectContactPreference")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ANY">
                        {t("contactPreferences.any")}
                      </SelectItem>
                      <SelectItem value="PLATFORM_ONLY">
                        {t("contactPreferences.platformOnly")}
                      </SelectItem>
                      <SelectItem value="PHONE">
                        {t("contactPreferences.phone")}
                      </SelectItem>
                      <SelectItem value="EMAIL">
                        {t("contactPreferences.email")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("contactPreferenceDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("termsAndConditions")}</CardTitle>
            <CardDescription>
              {t("termsAndConditionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t("termsAndConditionsTitle")}</AlertTitle>
              <AlertDescription>{t("termsAndConditionsInfo")}</AlertDescription>
            </Alert>

            <div className="p-4 border rounded-md bg-muted/50 text-sm">
              <h4 className="font-medium mb-2">
                Conditions générales de livraison
              </h4>
              <p className="mb-2">
                En acceptant ces conditions, vous reconnaissez avoir lu, compris
                et accepté les conditions générales relatives aux services de
                livraison d'EcoDeli.
              </p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>
                  EcoDeli agit en tant qu'intermédiaire entre les commerçants et
                  les livreurs.
                </li>
                <li>
                  Le commerçant est responsable de la préparation correcte des
                  articles à livrer et de leur conditionnement adéquat.
                </li>
                <li>
                  Le commerçant s'engage à fournir des informations précises
                  concernant le poids, les dimensions et toute exigence spéciale
                  concernant la livraison.
                </li>
                <li>
                  EcoDeli et ses livreurs partenaires ne peuvent être tenus
                  responsables des dommages causés aux articles en raison d'un
                  conditionnement inadéquat.
                </li>
                <li>
                  Les frais de service et de livraison seront clairement
                  indiqués avant la confirmation de chaque commande.
                </li>
              </ol>
            </div>

            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("acceptTerms")}</FormLabel>
                    <FormDescription>
                      {t("acceptTermsDescription")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.formState.errors.termsAccepted && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("termsError")}</AlertTitle>
                <AlertDescription>
                  {form.formState.errors.termsAccepted.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isProcessing}>
            {isProcessing ? (
              <>{t("saving")}</>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {t("saveAndContinue")}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
