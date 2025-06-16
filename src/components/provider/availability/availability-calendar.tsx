"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAvailabilitySchema } from "@/schemas/service/service.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, CalendarDays, Plus, X, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { TimeslotPicker } from "@/components/provider/availability/timeslot-picker";

interface AvailabilityFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
  };
  showBulkMode?: boolean;
}

/**
 * Formulaire avancé de gestion des disponibilités
 * Supporte la création en lot et les modèles prédéfinis
 */
export function AvailabilityForm({
  onSuccess,
  onCancel,
  initialData,
  showBulkMode = true}: AvailabilityFormProps) {
  const t = useTranslations("services.availability");
  const utils = api.useUtils();

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Modèles prédéfinis de disponibilité
  const templates = {
    "weekdays-9-17": {
      name: t("templates.weekdays"),
      description: t("templates.weekdaysDesc"),
      slots: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" }]},
    "weekend-10-16": {
      name: t("templates.weekend"),
      description: t("templates.weekendDesc"),
      slots: [
        { dayOfWeek: 6, startTime: "10:00", endTime: "16:00" },
        { dayOfWeek: 0, startTime: "10:00", endTime: "16:00" }]},
    "full-week-8-20": {
      name: t("templates.fullWeek"),
      description: t("templates.fullWeekDesc"),
      slots: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i,
        startTime: "08:00",
        endTime: "20:00" }))},
    flexible: {
      name: t("templates.flexible"),
      description: t("templates.flexibleDesc"),
      slots: [
        { dayOfWeek: 1, startTime: "14:00", endTime: "18:00" },
        { dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
        { dayOfWeek: 5, startTime: "14:00", endTime: "18:00" },
        { dayOfWeek: 6, startTime: "09:00", endTime: "12:00" }]}};

  // Formulaire principal
  const form = useForm({
    resolver: zodResolver(createAvailabilitySchema),
    defaultValues: {
      dayOfWeek: initialData?.dayOfWeek ?? 1,
      startTime: initialData?.startTime ?? "09:00",
      endTime: initialData?.endTime ?? "17:00"}});

  // Mutation pour créer une disponibilité
  const createAvailabilityMutation = api.service.createAvailability.useMutation(
    {
      onSuccess: () => {
        toast.success(t("added"));
        utils.service.getMyAvailabilities.invalidate();
        form.reset();
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || t("addFailed"));
      }},
  );

  // Récupérer les disponibilités existantes
  const availabilitiesQuery = api.service.getMyAvailabilities.useQuery();

  // Jours de la semaine
  const weekDays = [
    { value: 1, label: t("days.monday"), short: "Lun" },
    { value: 2, label: t("days.tuesday"), short: "Mar" },
    { value: 3, label: t("days.wednesday"), short: "Mer" },
    { value: 4, label: t("days.thursday"), short: "Jeu" },
    { value: 5, label: t("days.friday"), short: "Ven" },
    { value: 6, label: t("days.saturday"), short: "Sam" },
    { value: 0, label: t("days.sunday"), short: "Dim" }];

  // Soumission du formulaire
  const onSubmit = async (data: any) => {
    if (useTemplate && selectedTemplate) {
      // Créer toutes les disponibilités du modèle
      const template = templates[selectedTemplate as keyof typeof templates];
      for (const slot of template.slots) {
        await createAvailabilityMutation.mutateAsync(slot);
      }
    } else if (isBulkMode && selectedDays.length > 0) {
      // Créer pour plusieurs jours
      for (const dayOfWeek of selectedDays) {
        await createAvailabilityMutation.mutateAsync({ dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime });
      }
    } else {
      // Créer une seule disponibilité
      await createAvailabilityMutation.mutateAsync(data);
    }
  };

  // Basculer la sélection d'un jour
  const toggleDaySelection = (dayOfWeek: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((d) => d !== dayOfWeek)
        : [...prev, dayOfWeek],
    );
  };

  // Appliquer un modèle
  const applyTemplate = () => {
    if (selectedTemplate) {
      const template = templates[selectedTemplate as keyof typeof templates];
      createAvailabilityMutation.mutate(template.slots[0]);
    }
  };

  // Vérifier si un jour a déjà des disponibilités
  const hasExistingAvailability = (dayOfWeek: number) => {
    return availabilitiesQuery.data?.some((av) => av.dayOfWeek === dayOfWeek);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-semibold">{t("formTitle")}</h2>
        <p className="text-muted-foreground">{t("formDescription")}</p>
      </div>

      {/* Options de mode */}
      {showBulkMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("mode.title")}</CardTitle>
            <CardDescription>{t("mode.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="useTemplate"
                checked={useTemplate}
                onCheckedChange={setUseTemplate}
              />
              <Label htmlFor="useTemplate">{t("mode.useTemplate")}</Label>
            </div>

            {useTemplate && (
              <div className="space-y-3">
                <Label>{t("mode.selectTemplate")}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(templates).map(([key, template]) => (
                    <div
                      key={key}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate === key
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedTemplate(key)}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                      <div className="text-xs text-primary mt-1">
                        {template.slots.length} créneaux
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTemplate && (
                  <Button
                    onClick={applyTemplate}
                    disabled={createAvailabilityMutation.isPending}
                  >
                    {createAvailabilityMutation.isPending
                      ? t("applying")
                      : t("applyTemplate")}
                  </Button>
                )}
              </div>
            )}

            {!useTemplate && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="bulkMode"
                  checked={isBulkMode}
                  onCheckedChange={setIsBulkMode}
                />
                <Label htmlFor="bulkMode">{t("mode.bulkMode")}</Label>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulaire principal */}
      {!useTemplate && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("schedule.title")}
                </CardTitle>
                <CardDescription>{t("schedule.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sélection des jours */}
                {isBulkMode ? (
                  <div>
                    <Label className="text-base">{t("selectDays")}</Label>
                    <div className="grid grid-cols-7 gap-2 mt-2">
                      {weekDays.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={
                            selectedDays.includes(day.value)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className={`h-16 flex flex-col ${
                            hasExistingAvailability(day.value)
                              ? "border-orange-300 bg-orange-50"
                              : ""
                          }`}
                          onClick={() => toggleDaySelection(day.value)}
                        >
                          <span className="font-medium">{day.short}</span>
                          {hasExistingAvailability(day.value) && (
                            <AlertCircle className="h-3 w-3 text-orange-500 mt-1" />
                          )}
                        </Button>
                      ))}
                    </div>
                    {selectedDays.some((day) =>
                      hasExistingAvailability(day),
                    ) && (
                      <p className="text-sm text-orange-600 mt-2">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {t("warnings.existingAvailability")}
                      </p>
                    )}
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("day")}</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectDay")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {weekDays.map((day) => (
                              <SelectItem
                                key={day.value}
                                value={day.value.toString()}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{day.label}</span>
                                  {hasExistingAvailability(day.value) && (
                                    <Badge variant="secondary" className="ml-2">
                                      Existe
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Separator />

                {/* Sélection des heures avec TimeslotPicker */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("startTime")}</FormLabel>
                        <FormControl>
                          <TimeslotPicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("selectStartTime")}
                            mode="start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("endTime")}</FormLabel>
                        <FormControl>
                          <TimeslotPicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("selectEndTime")}
                            mode="end"
                            minTime={form.watch("startTime")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Aperçu de la disponibilité */}
                {form.watch("startTime") && form.watch("endTime") && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{t("preview")}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      {isBulkMode && selectedDays.length > 0 ? (
                        <span>
                          {selectedDays
                            .map(
                              (day) =>
                                weekDays.find((wd) => wd.value === day)?.short,
                            )
                            .join(", ")}{" "}
                          {t("from")} {form.watch("startTime")} {t("to")}{" "}
                          {form.watch("endTime")}
                        </span>
                      ) : (
                        <span>
                          {
                            weekDays.find(
                              (d) => d.value === form.watch("dayOfWeek"),
                            )?.label
                          }{" "}
                          {t("from")} {form.watch("startTime")} {t("to")}{" "}
                          {form.watch("endTime")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Boutons d'action */}
            <div className="flex gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t("cancel")}
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  createAvailabilityMutation.isPending ||
                  (isBulkMode && selectedDays.length === 0)
                }
                className="flex-1"
              >
                {createAvailabilityMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    {t("adding")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {isBulkMode && selectedDays.length > 1
                      ? t("addMultiple", { count: selectedDays.length })
                      : t("add")}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
