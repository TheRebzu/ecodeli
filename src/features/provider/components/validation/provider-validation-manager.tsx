"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, X, Clock, AlertTriangle, FileText, Star, Award, Shield, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProviderValidationManagerProps {
  providerId: string;
}

interface ValidationStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  required: boolean;
  order: number;
  estimatedDuration: string;
  documents: ValidationDocument[];
  criteria: ValidationCriteria[];
}

interface ValidationDocument {
  id: string;
  name: string;
  type: string;
  required: boolean;
  status: "missing" | "uploaded" | "approved" | "rejected";
  fileUrl?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface ValidationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  status: "pending" | "passed" | "failed";
  score?: number;
  maxScore: number;
  comments?: string;
}

interface ProviderApplication {
  id: string;
  providerId: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "pending_documents";
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  overallScore: number;
  maxScore: number;
  reviewerNotes?: string;
  validationSteps: ValidationStep[];
  serviceCategories: string[];
  proposedRates: Record<string, number>;
  availability: {
    days: string[];
    hours: { start: string; end: string };
  };
  coverageAreas: string[];
}

const VALIDATION_STEPS = [
  {
    id: "identity",
    name: "Vérification d'identité",
    description: "Validation de votre identité et de vos documents officiels",
    required: true,
    order: 1,
    estimatedDuration: "2-3 jours"
  },
  {
    id: "qualifications",
    name: "Vérification des qualifications",
    description: "Validation de vos diplômes, certifications et expériences",
    required: true,
    order: 2,
    estimatedDuration: "3-5 jours"
  },
  {
    id: "background_check",
    name: "Vérification des antécédents",
    description: "Contrôle du casier judiciaire et des références",
    required: true,
    order: 3,
    estimatedDuration: "5-7 jours"
  },
  {
    id: "skills_assessment",
    name: "Évaluation des compétences",
    description: "Test pratique de vos compétences dans votre domaine",
    required: true,
    order: 4,
    estimatedDuration: "1-2 jours"
  },
  {
    id: "interview",
    name: "Entretien de validation",
    description: "Entretien avec notre équipe de validation",
    required: true,
    order: 5,
    estimatedDuration: "1 jour"
  },
  {
    id: "final_review",
    name: "Révision finale",
    description: "Analyse finale de votre candidature",
    required: true,
    order: 6,
    estimatedDuration: "1-2 jours"
  }
];

export default function ProviderValidationManager({ providerId }: ProviderValidationManagerProps) {
  const t = useTranslations("provider.validation");
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ValidationStep | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);

  useEffect(() => {
    fetchValidationData();
  }, [providerId]);

  const fetchValidationData = async () => {
    try {
      const response = await fetch(`/api/provider/validation?providerId=${providerId}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
      }
    } catch (error) {
      console.error("Error fetching validation data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (stepId: string, documentType: string, file: File) => {
    setUploadingDocument(documentType);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("stepId", stepId);
      formData.append("documentType", documentType);
      formData.append("providerId", providerId);

      const response = await fetch("/api/provider/validation/documents", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        await fetchValidationData();
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploadingDocument(null);
    }
  };

  const submitApplication = async () => {
    try {
      const response = await fetch("/api/provider/validation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId })
      });

      if (response.ok) {
        await fetchValidationData();
      }
    } catch (error) {
      console.error("Error submitting application:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: t("status.draft"), icon: FileText },
      submitted: { color: "bg-blue-100 text-blue-800", label: t("status.submitted"), icon: Clock },
      under_review: { color: "bg-yellow-100 text-yellow-800", label: t("status.under_review"), icon: Clock },
      approved: { color: "bg-green-100 text-green-800", label: t("status.approved"), icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-800", label: t("status.rejected"), icon: X },
      pending_documents: { color: "bg-orange-100 text-orange-800", label: t("status.pending_documents"), icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStepStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-gray-100 text-gray-800", label: t("step_status.pending") },
      in_progress: { color: "bg-blue-100 text-blue-800", label: t("step_status.in_progress") },
      completed: { color: "bg-green-100 text-green-800", label: t("step_status.completed") },
      failed: { color: "bg-red-100 text-red-800", label: t("step_status.failed") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getDocumentStatusBadge = (status: string) => {
    const statusConfig = {
      missing: { color: "bg-gray-100 text-gray-800", label: t("document_status.missing") },
      uploaded: { color: "bg-blue-100 text-blue-800", label: t("document_status.uploaded") },
      approved: { color: "bg-green-100 text-green-800", label: t("document_status.approved") },
      rejected: { color: "bg-red-100 text-red-800", label: t("document_status.rejected") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const calculateCompletionPercentage = () => {
    if (!application) return 0;
    
    const completedSteps = application.validationSteps.filter(step => step.status === "completed").length;
    return Math.round((completedSteps / application.validationSteps.length) * 100);
  };

  const getNextRequiredAction = () => {
    if (!application) return null;

    const pendingStep = application.validationSteps
      .filter(step => step.required && step.status === "pending")
      .sort((a, b) => a.order - b.order)[0];

    if (pendingStep) {
      const missingDocs = pendingStep.documents.filter(doc => doc.required && doc.status === "missing");
      if (missingDocs.length > 0) {
        return {
          type: "document",
          step: pendingStep,
          documents: missingDocs
        };
      }
    }

    return null;
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  if (!application) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UserCheck className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("no_application.title")}</h3>
          <p className="text-gray-600 text-center mb-4">{t("no_application.description")}</p>
          <Button onClick={() => window.location.href = "/provider/validation"}>
            {t("no_application.start_application")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nextAction = getNextRequiredAction();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("description")}</p>
          </div>
          {getStatusBadge(application.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("progress.completion")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateCompletionPercentage()}%</div>
            <Progress value={calculateCompletionPercentage()} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {application.validationSteps.filter(s => s.status === "completed").length} / {application.validationSteps.length} {t("progress.steps_completed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("score.overall")}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{application.overallScore}/{application.maxScore}</div>
            <p className="text-xs text-muted-foreground">
              {t("score.percentage", { percentage: Math.round((application.overallScore / application.maxScore) * 100) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status.title")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t(`status.${application.status}`)}</div>
            {application.submittedAt && (
              <p className="text-xs text-muted-foreground">
                {t("submitted_at")}: {new Date(application.submittedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {nextAction && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">{t("next_action.title")}</h3>
                <p className="text-sm text-orange-700">
                  {nextAction.type === "document" && (
                    <>
                      {t("next_action.upload_documents", { step: nextAction.step.name })}:
                      {nextAction.documents.map(doc => (
                        <span key={doc.id} className="ml-1 font-medium">{doc.name}</span>
                      ))}
                    </>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedStep(nextAction.step);
                  setShowDocumentDialog(true);
                }}
              >
                {t("next_action.take_action")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="steps" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="steps">{t("tabs.validation_steps")}</TabsTrigger>
          <TabsTrigger value="documents">{t("tabs.documents")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          {application.validationSteps
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <Card key={step.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                        {step.order}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{step.name}</CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.required && <Badge variant="destructive" className="text-xs">{t("required")}</Badge>}
                      {getStepStatusBadge(step.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">{t("estimated_duration")}:</span>
                      <div className="font-medium">{step.estimatedDuration}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{t("documents_required")}:</span>
                      <div className="font-medium">{step.documents.filter(d => d.required).length}</div>
                    </div>
                  </div>

                  {step.documents.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">{t("required_documents")}:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {step.documents.filter(doc => doc.required).map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{doc.name}</span>
                            {getDocumentStatusBadge(doc.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.criteria.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">{t("evaluation_criteria")}:</h4>
                      <div className="space-y-2">
                        {step.criteria.map((criteria) => (
                          <div key={criteria.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <span className="text-sm font-medium">{criteria.name}</span>
                              <p className="text-xs text-gray-600">{criteria.description}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">
                                {criteria.score || 0}/{criteria.maxScore}
                              </span>
                              <div className="text-xs text-gray-600">{t("weight")}: {criteria.weight}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {step.status === "pending" && step.documents.some(d => d.required && d.status === "missing") && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedStep(step);
                          setShowDocumentDialog(true);
                        }}
                      >
                        {t("actions.upload_documents")}
                      </Button>
                    )}
                    
                    {step.status === "completed" && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t("step_completed")}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {application.validationSteps.map((step) => (
            <Card key={step.id}>
              <CardHeader>
                <CardTitle>{step.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {step.documents.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{doc.name}</h4>
                        {getDocumentStatusBadge(doc.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{doc.type}</p>
                      
                      {doc.status === "missing" && (
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleDocumentUpload(step.id, doc.type, file);
                            }
                          }}
                          disabled={uploadingDocument === doc.type}
                        />
                      )}
                      
                      {doc.fileUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.fileUrl} target="_blank">
                            {t("actions.view_document")}
                          </a>
                        </Button>
                      )}

                      {doc.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">
                            <strong>{t("rejection_reason")}:</strong> {doc.rejectionReason}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("application_timeline")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">{t("timeline.application_created")}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(application.submittedAt || "").toLocaleString()}
                    </p>
                  </div>
                </div>

                {application.reviewedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{t("timeline.review_started")}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(application.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {application.approvedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{t("timeline.application_approved")}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(application.approvedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {application.rejectedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{t("timeline.application_rejected")}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(application.rejectedAt).toLocaleString()}
                      </p>
                      {application.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">
                          {t("reason")}: {application.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {application.reviewerNotes && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-semibold mb-2">{t("reviewer_notes")}</h4>
                  <p className="text-sm text-blue-800">{application.reviewerNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {application.status === "draft" && (
        <div className="mt-6 flex justify-center">
          <Button onClick={submitApplication} size="lg">
            {t("actions.submit_application")}
          </Button>
        </div>
      )}

      {showDocumentDialog && selectedStep && (
        <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("document_dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("document_dialog.description", { step: selectedStep.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedStep.documents.filter(doc => doc.required && doc.status === "missing").map((doc) => (
                <div key={doc.id} className="space-y-2">
                  <Label>{doc.name}</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleDocumentUpload(selectedStep.id, doc.type, file);
                      }
                    }}
                    disabled={uploadingDocument === doc.type}
                  />
                  {uploadingDocument === doc.type && (
                    <p className="text-sm text-blue-600">{t("uploading")}</p>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowDocumentDialog(false)}>
                {t("document_dialog.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}