"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Shield,
  Upload,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ValidationManagerProps {
  providerId: string;
}

interface ValidationStep {
  id: string;
  name: string;
  description: string;
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "rejected"
    | "requires_action";
  required: boolean;
  completedAt?: string;
  rejectedReason?: string;
  documents?: ValidationDocument[];
  progress: number;
}

interface ValidationDocument {
  id: string;
  name: string;
  type: string;
  status: string;
  uploadedAt: string;
  url: string;
  rejectedReason?: string;
  expiresAt?: string;
}

interface ValidationStatus {
  overallStatus:
    | "pending"
    | "in_progress"
    | "validated"
    | "rejected"
    | "suspended";
  completionPercentage: number;
  validatedAt?: string;
  nextReviewDate?: string;
  canStartWorking: boolean;
  restrictions?: string[];
}

export default function ValidationManager({
  providerId,
}: ValidationManagerProps) {
  const t = useTranslations("provider.validation");
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus | null>(null);
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchValidationData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/provider/validation?providerId=${providerId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setValidationStatus(data.status);
        setValidationSteps(data.steps || []);
      }
    } catch (error) {
      console.error("Error fetching validation data:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const requestRevalidation = async (stepId: string) => {
    try {
      const response = await fetch(
        `/api/provider/validation/${stepId}/revalidate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId }),
        },
      );

      if (response.ok) {
        toast.success(t("success.revalidation_requested"));
        fetchValidationData();
      } else {
        toast.error(t("error.revalidation_failed"));
      }
    } catch (error) {
      console.error("Error requesting revalidation:", error);
      toast.error(t("error.revalidation_failed"));
    }
  };

  const uploadDocument = async (stepId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("stepId", stepId);
      formData.append("providerId", providerId);

      const response = await fetch("/api/provider/validation/documents", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success(t("success.document_uploaded"));
        fetchValidationData();
      } else {
        toast.error(t("error.upload_failed"));
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(t("error.upload_failed"));
    }
  };

  useEffect(() => {
    fetchValidationData();
  }, [providerId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        color: "bg-gray-100 text-gray-800",
        icon: Clock,
        label: t("status.pending"),
      },
      in_progress: {
        color: "bg-blue-100 text-blue-800",
        icon: RefreshCw,
        label: t("status.in_progress"),
      },
      completed: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: t("status.completed"),
      },
      rejected: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        label: t("status.rejected"),
      },
      requires_action: {
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertTriangle,
        label: t("status.requires_action"),
      },
      validated: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: t("status.validated"),
      },
      suspended: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        label: t("status.suspended"),
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStepIcon = (stepId: string) => {
    const iconMap: Record<string, any> = {
      identity: User,
      address: MapPin,
      contact: Phone,
      email: Mail,
      insurance: Shield,
      certifications: FileText,
      bank_account: CreditCard,
    };
    return iconMap[stepId] || FileText;
  };

  if (loading || !validationStatus) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Status Overview */}
      <Card
        className={
          validationStatus.overallStatus === "validated"
            ? "border-green-200 bg-green-50"
            : validationStatus.overallStatus === "rejected"
              ? "border-red-200 bg-red-50"
              : ""
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6" />
              <span>{t("validation_status")}</span>
            </div>
            {getStatusBadge(validationStatus.overallStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{t("completion_progress")}</span>
              <span>{validationStatus.completionPercentage}%</span>
            </div>
            <Progress
              value={validationStatus.completionPercentage}
              className="h-2"
            />
          </div>

          {validationStatus.overallStatus === "validated" && (
            <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">{t("congratulations")}</p>
                  <p className="text-sm">
                    {t("validated_message")}{" "}
                    {validationStatus.validatedAt &&
                      new Date(
                        validationStatus.validatedAt,
                      ).toLocaleDateString()}
                  </p>
                  {validationStatus.nextReviewDate && (
                    <p className="text-sm mt-1">
                      {t("next_review")}:{" "}
                      {new Date(
                        validationStatus.nextReviewDate,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {validationStatus.overallStatus === "rejected" && (
            <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <XCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">{t("validation_rejected")}</p>
                  <p className="text-sm">{t("review_requirements")}</p>
                </div>
              </div>
            </div>
          )}

          {!validationStatus.canStartWorking && (
            <div className="p-4 bg-yellow-100 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-medium">{t("cannot_work_yet")}</p>
                  <p className="text-sm">{t("complete_validation_first")}</p>
                </div>
              </div>
            </div>
          )}

          {validationStatus.restrictions &&
            validationStatus.restrictions.length > 0 && (
              <div className="p-4 bg-orange-100 border border-orange-200 rounded-lg">
                <div className="text-orange-800">
                  <p className="font-medium">{t("current_restrictions")}</p>
                  <ul className="text-sm mt-1 list-disc list-inside">
                    {validationStatus.restrictions.map((restriction, index) => (
                      <li key={index}>{restriction}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Validation Steps */}
      <Tabs defaultValue="steps" className="space-y-6">
        <TabsList>
          <TabsTrigger value="steps">{t("tabs.validation_steps")}</TabsTrigger>
          <TabsTrigger value="documents">{t("tabs.documents")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          {validationSteps.map((step, index) => {
            const StepIcon = getStepIcon(step.id);

            return (
              <Card
                key={step.id}
                className={`${step.status === "rejected" ? "border-red-200" : step.status === "completed" ? "border-green-200" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-full ${
                          step.status === "completed"
                            ? "bg-green-100"
                            : step.status === "rejected"
                              ? "bg-red-100"
                              : step.status === "in_progress"
                                ? "bg-blue-100"
                                : "bg-gray-100"
                        }`}
                      >
                        <StepIcon
                          className={`w-5 h-5 ${
                            step.status === "completed"
                              ? "text-green-600"
                              : step.status === "rejected"
                                ? "text-red-600"
                                : step.status === "in_progress"
                                  ? "text-blue-600"
                                  : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{step.name}</h3>
                        <p className="text-sm text-gray-600">
                          {step.description}
                        </p>
                      </div>
                      {step.required && (
                        <Badge variant="outline" className="text-xs">
                          {t("required")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(step.status)}
                      <span className="text-sm text-gray-500">
                        {step.progress}%
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {step.progress > 0 && step.progress < 100 && (
                    <Progress value={step.progress} className="h-2" />
                  )}

                  {step.status === "rejected" && step.rejectedReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-800">
                        <strong>{t("rejection_reason")}:</strong>{" "}
                        {step.rejectedReason}
                      </p>
                    </div>
                  )}

                  {step.status === "requires_action" && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        {t("action_required_message")}
                      </p>
                    </div>
                  )}

                  {step.documents && step.documents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">{t("documents")}:</h4>
                      {step.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-gray-500">
                                {t("uploaded")}:{" "}
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                              {doc.expiresAt && (
                                <p className="text-xs text-yellow-600">
                                  {t("expires")}:{" "}
                                  {new Date(doc.expiresAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(doc.status)}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(step.status === "pending" ||
                      step.status === "requires_action") && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadDocument(step.id, file);
                            }
                          }}
                        />
                        <Button size="sm">
                          <Upload className="w-4 h-4 mr-2" />
                          {t("upload_document")}
                        </Button>
                      </label>
                    )}

                    {step.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => requestRevalidation(step.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t("request_revalidation")}
                      </Button>
                    )}

                    {step.status === "completed" && step.completedAt && (
                      <div className="flex items-center text-sm text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t("completed_on")}:{" "}
                        {new Date(step.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("all_documents")}</CardTitle>
            </CardHeader>
            <CardContent>
              {validationSteps.some(
                (step) => step.documents && step.documents.length > 0,
              ) ? (
                <div className="space-y-4">
                  {validationSteps.map((step) =>
                    step.documents && step.documents.length > 0 ? (
                      <div key={step.id}>
                        <h4 className="font-medium mb-2">{step.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {step.documents.map((doc) => (
                            <Card key={doc.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-8 h-8 text-gray-400" />
                                  <div>
                                    <p className="font-medium">{doc.name}</p>
                                    <p className="text-sm text-gray-600">
                                      {doc.type}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(
                                        doc.uploadedAt,
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {getStatusBadge(doc.status)}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="mt-2"
                                    onClick={() =>
                                      window.open(doc.url, "_blank")
                                    }
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    {t("view")}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("no_documents_title")}
                  </h3>
                  <p className="text-gray-600">
                    {t("no_documents_description")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("validation_history")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("history_coming_soon")}
                </h3>
                <p className="text-gray-600">{t("history_description")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
