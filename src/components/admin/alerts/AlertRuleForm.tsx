"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertTriangle, ChevronDown, Check } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertRule, createAlertRuleSchema } from "@/lib/schema/alert.schema";
import { createAlertRule, updateAlertRule } from "@/lib/actions/alerts.action";

interface AlertRuleFormProps {
  existingRule?: AlertRule;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AlertRuleForm({ existingRule, onSuccess, onCancel }: AlertRuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof createAlertRuleSchema>>({
    resolver: zodResolver(createAlertRuleSchema),
    defaultValues: existingRule ?? {
      name: "",
      metricType: "REVENUE",
      condition: "ABOVE",
      threshold: 100,
      enabled: true,
      notifyEmail: true,
      notifyDashboard: true,
    },
  });

  const onSubmit = async (data: z.infer<typeof createAlertRuleSchema>) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (existingRule?.id) {
        await updateAlertRule(existingRule.id, data);
      } else {
        await createAlertRule(data);
      }
      onSuccess();
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingRule ? "Modifier la règle d'alerte" : "Nouvelle règle d'alerte"}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive rounded-md p-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la règle</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Baisse de revenus mensuels" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="metricType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Métrique</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une métrique" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REVENUE">Revenus</SelectItem>
                        <SelectItem value="SHIPMENTS">Livraisons</SelectItem>
                        <SelectItem value="USERS">Utilisateurs</SelectItem>
                        <SelectItem value="SATISFACTION">Satisfaction</SelectItem>
                        <SelectItem value="COURIER_DELAY">Retards livreurs</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ABOVE">Au-dessus de</SelectItem>
                        <SelectItem value="BELOW">En-dessous de</SelectItem>
                        <SelectItem value="EQUAL">Égal à</SelectItem>
                        <SelectItem value="CHANGE_RATE">Taux de variation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2 pt-4">
              <FormLabel>Notifications</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="notifyEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Email</FormLabel>
                        <FormDescription>
                          Recevoir des alertes par email
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notifyDashboard"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Dashboard</FormLabel>
                        <FormDescription>
                          Afficher les alertes sur le dashboard
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 mt-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Activée</FormLabel>
                    <FormDescription>
                      Activer cette règle d'alerte
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                "Enregistrement..."
              ) : existingRule ? (
                "Mettre à jour"
              ) : (
                "Créer la règle"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 