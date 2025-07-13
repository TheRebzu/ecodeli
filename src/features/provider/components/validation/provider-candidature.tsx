"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  User,
  Settings,
  Award,
  DollarSign,
  ArrowRight,
  AlertCircle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ValidationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  route: string;
  icon: any;
  requiredFields: string[];
}

interface ProviderValidationData {
  id: string;
  validationStatus: string;
  profileCompletion: number;
  servicesCompletion: number;
  certificationsCompletion: number;
  ratesCompletion: number;
  lastUpdated: string;
  validationNotes?: string;
}

export function ProviderCandidature() {
  const { user } = useAuth();
  const { execute } = useApi();
  const [validationData, setValidationData] =
    useState<ProviderValidationData | null>(null);
  const [loading, setLoading] = useState(true);

  const get = async (url: string) => {
    return await execute(url, { method: "GET" });
  };

  const post = async (url: string, options: { body: string }) => {
    return await execute(url, {
      method: "POST",
      body: options.body,
      headers: { "Content-Type": "application/json" },
    });
  };

  useEffect(() => {
    if (user?.id) {
      fetchValidationData();
    }
  }, [user?.id]);

  const fetchValidationData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await get(
        `/api/provider/validation/overview?providerId=${user.id}`,
      );
      if (response) {
        setValidationData(response);
      }
    } catch (error) {
      console.error("Error fetching validation data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const submitForValidation = async () => {
    if (!user?.id) return;

    try {
      const response = await post("/api/provider/validation/submit", {
        body: JSON.stringify({ providerId: user.id }),
      });

      if (response) {
        toast.success("Candidature envoyée pour validation");
        fetchValidationData();
      }
    } catch (error) {
      console.error("Error submitting validation:", error);
      toast.error("Erreur lors de l'envoi de la candidature");
    }
  };

  const validationSteps: ValidationStep[] = [
    {
      id: "profile",
      title: "Profil prestataire",
      description: "Informations professionnelles et juridiques",
      status: validationData
        ? validationData.profileCompletion === 100
          ? "completed"
          : validationData.profileCompletion > 0
            ? "in_progress"
            : "pending"
        : "pending",
      route: "/provider/validation/profile",
      icon: User,
      requiredFields: [
        "businessName",
        "siret",
        "description",
        "phone",
        "address",
      ],
    },
    {
      id: "services",
      title: "Types de prestations",
      description: "Services proposés et modalités",
      status: validationData
        ? validationData.servicesCompletion === 100
          ? "completed"
          : validationData.servicesCompletion > 0
            ? "in_progress"
            : "pending"
        : "pending",
      route: "/provider/validation/services",
      icon: Settings,
      requiredFields: ["services", "availability"],
    },
    {
      id: "certifications",
      title: "Habilitations",
      description: "Certifications et documents obligatoires",
      status: validationData
        ? validationData.certificationsCompletion === 100
          ? "completed"
          : validationData.certificationsCompletion > 0
            ? "in_progress"
            : "pending"
        : "pending",
      route: "/provider/validation/certifications",
      icon: Award,
      requiredFields: ["certifications", "documents"],
    },
    {
      id: "rates",
      title: "Tarifs négociés",
      description: "Grille tarifaire et commissions",
      status: validationData
        ? validationData.ratesCompletion === 100
          ? "completed"
          : validationData.ratesCompletion > 0
            ? "in_progress"
            : "pending"
        : "pending",
      route: "/provider/validation/rates",
      icon: DollarSign,
      requiredFields: ["rates", "commission"],
    },
  ];

  const getStepIcon = (step: ValidationStep) => {
    const Icon = step.icon;
    const statusConfig = {
      pending: { color: "text-gray-400", bgColor: "bg-gray-100" },
      in_progress: { color: "text-blue-600", bgColor: "bg-blue-100" },
      completed: { color: "text-green-600", bgColor: "bg-green-100" },
      blocked: { color: "text-red-600", bgColor: "bg-red-100" },
    };

    const config = statusConfig[step.status];

    return (
      <div className={`p-3 rounded-full ${config.bgColor}`}>
        {step.status === "completed" ? (
          <CheckCircle className={`h-6 w-6 ${config.color}`} />
        ) : (
          <Icon className={`h-6 w-6 ${config.color}`} />
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: { color: "bg-gray-100 text-gray-800", label: "Brouillon" },
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: "En attente" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "Validé" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "Rejeté" },
    };

    const statusConfig = config[status as keyof typeof config] || config.DRAFT;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const getTotalCompletion = () => {
    if (!validationData) return 0;
    return Math.round(
      (validationData.profileCompletion +
        validationData.servicesCompletion +
        validationData.certificationsCompletion +
        validationData.ratesCompletion) /
        4,
    );
  };

  const canSubmitForValidation = () => {
    return (
      validationData &&
      validationData.profileCompletion === 100 &&
      validationData.servicesCompletion === 100 &&
      validationData.certificationsCompletion === 100 &&
      validationData.ratesCompletion === 100 &&
      validationData.validationStatus === "DRAFT"
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Candidature Prestataire</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Complétez votre candidature en 4 étapes pour devenir prestataire
          certifié EcoDeli. Chaque étape est essentielle pour valider votre
          profil professionnel.
        </p>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Statut de la candidature</span>
            {validationData && getStatusBadge(validationData.validationStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progression globale</span>
              <span className="text-sm font-medium">
                {getTotalCompletion()}%
              </span>
            </div>
            <Progress value={getTotalCompletion()} className="h-2" />

            {validationData?.validationStatus === "REJECTED" &&
              validationData.validationNotes && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">
                        Candidature rejetée
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        {validationData.validationNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {validationData?.validationStatus === "PENDING" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      En cours de validation
                    </p>
                    <p className="text-sm text-yellow-600">
                      Votre candidature est en cours d'examen par notre équipe
                    </p>
                  </div>
                </div>
              </div>
            )}

            {validationData?.validationStatus === "APPROVED" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">
                      Candidature approuvée
                    </p>
                    <p className="text-sm text-green-600">
                      Félicitations ! Vous êtes maintenant prestataire certifié
                      EcoDeli
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Étapes de validation</h2>

        <div className="grid gap-6">
          {validationSteps.map((step, index) => (
            <Card
              key={step.id}
              className={`transition-all ${step.status === "completed" ? "border-green-200" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStepIcon(step)}
                    <div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {step.status === "completed" && (
                      <Badge className="bg-green-100 text-green-800">
                        Terminé
                      </Badge>
                    )}
                    {step.status === "in_progress" && (
                      <Badge className="bg-blue-100 text-blue-800">
                        En cours
                      </Badge>
                    )}
                    {step.status === "pending" && (
                      <Badge variant="outline">À faire</Badge>
                    )}
                    <Link href={step.route}>
                      <Button variant="outline" size="sm">
                        {step.status === "completed" ? "Modifier" : "Compléter"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Étape {index + 1} sur {validationSteps.length}
                  </span>
                  <div className="flex items-center space-x-2">
                    {step.status === "completed" ? (
                      <span className="text-sm text-green-600 font-medium">
                        100%
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {validationData
                          ? step.id === "profile"
                            ? validationData.profileCompletion
                            : step.id === "services"
                              ? validationData.servicesCompletion
                              : step.id === "certifications"
                                ? validationData.certificationsCompletion
                                : step.id === "rates"
                                  ? validationData.ratesCompletion
                                  : 0
                          : 0}
                        %
                      </span>
                    )}
                  </div>
                </div>
                <Progress
                  value={
                    validationData
                      ? step.id === "profile"
                        ? validationData.profileCompletion
                        : step.id === "services"
                          ? validationData.servicesCompletion
                          : step.id === "certifications"
                            ? validationData.certificationsCompletion
                            : step.id === "rates"
                              ? validationData.ratesCompletion
                              : 0
                      : 0
                  }
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Submit Section */}
      {canSubmitForValidation() && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">
              Prêt pour la validation
            </CardTitle>
            <CardDescription className="text-green-700">
              Toutes les étapes sont complétées. Vous pouvez maintenant
              soumettre votre candidature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={submitForValidation}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Soumettre ma candidature
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Besoin d'aide ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Chaque étape doit être complétée à 100% avant la soumission
            </p>
            <p className="text-sm text-muted-foreground">
              • Les documents doivent être au format PDF, JPG ou PNG
            </p>
            <p className="text-sm text-muted-foreground">
              • La validation prend généralement 2-3 jours ouvrés
            </p>
            <p className="text-sm text-muted-foreground">
              • En cas de questions, contactez notre support à
              prestataires@ecodeli.fr
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
