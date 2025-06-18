"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Schéma de validation pour le service
const serviceSchema = z.object({
  name: z.string().min(1, "Le nom du service est requis"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  categoryId: z.string().min(1, "Une catégorie est requise"),
  basePrice: z.number().min(0, "Le prix doit être positif"),
  duration: z.number().min(1, "La durée doit être d'au moins 1 minute"),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  requirements: z.string().optional(),
  maxDistance: z.number().min(0).optional(),
  isEmergency: z.boolean().default(false),
  emergencyFee: z.number().min(0).optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface CreateServiceModalProps {
  service?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ServiceFormData) => Promise<void>;
  categories: Array<{ id: string; name: string }>;
  isLoading: boolean;
}

export function CreateServiceModal({
  service,
  isOpen,
  onClose,
  onSave,
  categories,
  isLoading,
}: CreateServiceModalProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState("");

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      basePrice: 0,
      duration: 30,
      isActive: true,
      tags: [],
      requirements: "",
      maxDistance: 10,
      isEmergency: false,
      emergencyFee: 0,
    },
  });

  // Pré-remplir le formulaire si on édite un service existant
  useEffect(() => {
    if (service && isOpen) {
      form.reset({
        name: service.name || "",
        description: service.description || "",
        categoryId: service.categoryId || "",
        basePrice: service.basePrice || 0,
        duration: service.duration || 30,
        isActive: service.isActive ?? true,
        tags: service.tags || [],
        requirements: service.requirements || "",
        maxDistance: service.maxDistance || 10,
        isEmergency: service.isEmergency || false,
        emergencyFee: service.emergencyFee || 0,
      });
    } else if (!service && isOpen) {
      form.reset({
        name: "",
        description: "",
        categoryId: "",
        basePrice: 0,
        duration: 30,
        isActive: true,
        tags: [],
        requirements: "",
        maxDistance: 10,
        isEmergency: false,
        emergencyFee: 0,
      });
    }
  }, [service, isOpen, form]);

  const onSubmit = async (data: ServiceFormData) => {
    try {
      await onSave(data);
      toast({
        title: t('common.success'),
        description: service 
          ? t('admin.services.updateSuccess')
          : t('admin.services.createSuccess'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('common.errorGeneric'),
        variant: 'destructive',
      });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {service ? t('admin.services.editService') : t('admin.services.createService')}
          </DialogTitle>
          <DialogDescription>
            {service 
              ? t('admin.services.editDescription')
              : t('admin.services.createDescription')
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.services.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('admin.services.namePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.services.category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.services.selectCategory')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.services.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('admin.services.descriptionPlaceholder')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prix et durée */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.services.basePrice')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.services.duration')} (min)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.services.maxDistance')} (km)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.services.tags')}</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('admin.services.addTag')}
                      />
                      <Button type="button" onClick={handleAddTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Options avancées */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t('admin.services.activeService')}</FormLabel>
                      <FormDescription>
                        {t('admin.services.activeDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isEmergency"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t('admin.services.emergencyService')}</FormLabel>
                      <FormDescription>
                        {t('admin.services.emergencyDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('isEmergency') && (
                <FormField
                  control={form.control}
                  name="emergencyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.services.emergencyFee')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('admin.services.emergencyFeeDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Exigences */}
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.services.requirements')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('admin.services.requirementsPlaceholder')}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('admin.services.requirementsDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {service ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 