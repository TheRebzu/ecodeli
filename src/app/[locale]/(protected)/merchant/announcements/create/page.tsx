"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AnnouncementForm } from "@/components/ui/form";
import { ArrowLeft, Save, Settings, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TariffSettingsForm } from "@/components/merchant/announcements/tariff-settings-form";
import { TermsAndConditionsForm } from "@/components/merchant/announcements/terms-conditions-form";
import { Separator } from "@/components/ui/separator";
import { type AnnouncementFormData } from "@/schemas/delivery/announcement.schema";

export default function CreateAnnouncementPage() {
  const t = useTranslations("merchant.announcements.create");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [formState, setFormState] = useState<Partial<AnnouncementFormData>>({ title: "",
    description: "",
    category: "",
    type: "STANDARD",
    pickupAddress: "",
    deliveryAddress: "",
    pickupDateStart: undefined,
    pickupDateEnd: undefined,
    deliveryDateStart: undefined,
    deliveryDateEnd: undefined,
    weight: undefined,
    volume: undefined,
    quantity: 1,
    fragile: false,
    status: "DRAFT",
    images: [],
    tags: [],
    termsAccepted: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation pour créer une annonce
  const createAnnouncementMutation =
    api.merchant.announcements.create.useMutation({
      onSuccess: (data) => {
        toast.success(t("createSuccess"));
        // Rediriger vers la page de détails de l'annonce
        router.push(`/merchant/announcements/${data.id}`);
      },
      onError: (error) => {
        toast.error(t("createError", { error: error.message }));
        setIsSubmitting(false);
      }});

  const handleUpdateForm = (data: Partial<AnnouncementFormData>) => {
    setFormState((prev) => ({ ...prev, ...data  }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSaveDraft = () => {
    if (!formState.title) {
      toast.error(t("titleRequired"));
      return;
    }

    setIsSubmitting(true);
    createAnnouncementMutation.mutate({
      ...formState,
      status: "DRAFT"} as AnnouncementFormData);
  };

  const handlePublish = () => {
    // Vérifications de base
    if (!formState.title) {
      toast.error(t("titleRequired"));
      return;
    }

    if (!formState.description) {
      toast.error(t("descriptionRequired"));
      return;
    }

    if (!formState.pickupAddress) {
      toast.error(t("pickupAddressRequired"));
      return;
    }

    if (!formState.deliveryAddress) {
      toast.error(t("deliveryAddressRequired"));
      return;
    }

    // Validation supplémentaire selon les besoins
    if (!formState.termsAccepted) {
      toast.error(t("termsAcceptanceRequired"));
      setActiveTab("terms");
      return;
    }

    setIsSubmitting(true);
    createAnnouncementMutation.mutate({
      ...formState,
      status: "ACTIVE"} as AnnouncementFormData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader heading={t("title")} description={t("description")} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("cancel")}
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            <Save className="mr-2 h-4 w-4" />
            {t("saveDraft")}
          </Button>
          <Button onClick={handlePublish} disabled={isSubmitting}>
            {t("publish")}
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="details"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("tabs.details")}
          </TabsTrigger>
          <TabsTrigger value="tariffs" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("tabs.tariffs")}
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("tabs.terms")}
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-6">
            <TabsContent value="details" className="mt-0">
              <AnnouncementForm
                data={formState}
                onUpdateForm={handleUpdateForm}
                isLoading={isSubmitting}
              />
            </TabsContent>

            <TabsContent value="tariffs" className="mt-0">
              <TariffSettingsForm
                data={formState}
                onUpdateForm={handleUpdateForm}
                isLoading={isSubmitting}
              />
            </TabsContent>

            <TabsContent value="terms" className="mt-0">
              <TermsAndConditionsForm
                data={formState}
                onUpdateForm={handleUpdateForm}
                isLoading={isSubmitting}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={handleCancel}>
          {t("cancel")}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            {t("saveDraft")}
          </Button>
          <Button onClick={handlePublish} disabled={isSubmitting}>
            {t("publish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
