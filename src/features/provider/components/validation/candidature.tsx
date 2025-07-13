"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface ValidationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  href: string;
}

export function ProviderCandidature() {
  const t = useTranslations("provider.validation");
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // État des étapes de validation
  const [validationSteps] = useState<ValidationStep[]>([
    {
      id: "profile",
      title: t("steps.profile.title"),
      description: t("steps.profile.description"),
      status: user?.validationStatus === "VALIDATED" ? "completed" : "pending",
      href: "/provider/validation/profile",
    },
    {
      id: "services",
      title: t("steps.services.title"),
      description: t("steps.services.description"),
      status: "pending",
      href: "/provider/validation/services",
    },
    {
      id: "certifications",
      title: t("steps.certifications.title"),
      description: t("steps.certifications.description"),
      status: "pending",
      href: "/provider/validation/certifications",
    },
    {
      id: "rates",
      title: t("steps.rates.title"),
      description: t("steps.rates.description"),
      status: "pending",
      href: "/provider/validation/rates",
    },
  ]);

  // Calculer le pourcentage de progression
  const completedSteps = validationSteps.filter(
    (step) => step.status === "completed",
  ).length;
  const progressPercentage = (completedSteps / validationSteps.length) * 100;

  const handleSubmitCandidature = async () => {
    // Vérifier que toutes les étapes sont complétées
    const allCompleted = validationSteps.every(
      (step) => step.status === "completed",
    );

    if (!allCompleted) {
      toast.error(t("errors.incomplete_steps"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/provider/validation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: user?.id }),
      });

      if (!response.ok) throw new Error("Failed to submit candidature");

      toast.success(t("success.candidature_submitted"));
      router.push("/provider/dashboard");
    } catch (error) {
      toast.error(t("errors.submission_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepIcon = (status: ValidationStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Circle className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "rejected":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Barre de progression */}
      <Card>
        <CardHeader>
          <CardTitle>{t("progress.title")}</CardTitle>
          <CardDescription>
            {t("progress.description", {
              completed: completedSteps,
              total: validationSteps.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {progressPercentage.toFixed(0)}% {t("progress.completed")}
          </p>
        </CardContent>
      </Card>

      {/* Étapes de validation */}
      <div className="space-y-4">
        {validationSteps.map((step, index) => (
          <Card
            key={step.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              step.status === "completed"
                ? "border-green-200 bg-green-50/50"
                : ""
            }`}
            onClick={() => router.push(step.href)}
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                {step.status === "completed"
                  ? t("actions.view")
                  : t("actions.complete")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bouton de soumission */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t("submit.title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("submit.description")}
              </p>
            </div>
            <Button
              onClick={handleSubmitCandidature}
              disabled={progressPercentage < 100 || isSubmitting}
              size="lg"
            >
              {isSubmitting ? t("submit.submitting") : t("submit.button")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">{t("info.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• {t("info.autoentrepreneur")}</li>
            <li>• {t("info.rates_negotiated")}</li>
            <li>• {t("info.quality_service")}</li>
            <li>• {t("info.regular_evaluations")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
