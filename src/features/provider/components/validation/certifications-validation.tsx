"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  FileText,
  Eye,
  Shield,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CertificationsValidationProps {
  providerId: string;
}

interface Certification {
  id: string;
  name: string;
  type: string;
  issuingOrganization: string;
  certificationNumber: string;
  issuedDate: string;
  expirationDate?: string;
  validationStatus: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  validationNotes?: string;
  documentUrl?: string;
  isRequired: boolean;
  serviceTypes: string[];
  createdAt: string;
}

interface RequiredCertification {
  type: string;
  name: string;
  description: string;
  serviceTypes: string[];
  isCompulsory: boolean;
}

const CERTIFICATION_TYPES = [
  { value: "DRIVING_LICENSE", label: "Permis de conduire", icon: "🚗" },
  { value: "PROFESSIONAL_CARD", label: "Carte professionnelle", icon: "💼" },
  { value: "INSURANCE", label: "Assurance professionnelle", icon: "🛡️" },
  {
    value: "TRAINING_CERTIFICATE",
    label: "Certificat de formation",
    icon: "📚",
  },
  { value: "HEALTH_CERTIFICATE", label: "Certificat médical", icon: "🏥" },
  { value: "BACKGROUND_CHECK", label: "Casier judiciaire", icon: "📋" },
  { value: "FIRST_AID", label: "Premiers secours", icon: "🚑" },
  { value: "LANGUAGE_CERTIFICATE", label: "Certificat de langue", icon: "🗣️" },
  { value: "OTHER", label: "Autre", icon: "📄" },
];

const REQUIRED_CERTIFICATIONS: RequiredCertification[] = [
  {
    type: "DRIVING_LICENSE",
    name: "Permis de conduire",
    description: "Permis de conduire valide pour les services de transport",
    serviceTypes: ["TRANSPORT", "SHOPPING"],
    isCompulsory: true,
  },
  {
    type: "BACKGROUND_CHECK",
    name: "Extrait de casier judiciaire",
    description: "Bulletin n°3 du casier judiciaire de moins de 3 mois",
    serviceTypes: ["BABYSITTING", "PET_SITTING", "CLEANING"],
    isCompulsory: true,
  },
  {
    type: "INSURANCE",
    name: "Assurance responsabilité civile professionnelle",
    description: "Assurance couvrant vos activités professionnelles",
    serviceTypes: ["ALL"],
    isCompulsory: true,
  },
  {
    type: "FIRST_AID",
    name: "Formation premiers secours",
    description: "Certificat PSC1 ou équivalent",
    serviceTypes: ["BABYSITTING", "PET_SITTING"],
    isCompulsory: false,
  },
];

export function ProviderCertificationsValidation({
  providerId,
}: CertificationsValidationProps) {
  const t = useTranslations("provider.validation.certifications");
  const { execute } = useApi();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [requiredCerts, setRequiredCerts] = useState<RequiredCertification[]>(
    REQUIRED_CERTIFICATIONS,
  );
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Créer les méthodes GET, POST et PUT basées sur execute
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

  const put = async (url: string, options: { body: string }) => {
    return await execute(url, {
      method: "PUT",
      body: options.body,
      headers: { "Content-Type": "application/json" },
    });
  };

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    issuingOrganization: "",
    certificationNumber: "",
    issuedDate: "",
    expirationDate: "",
    serviceTypes: [] as string[],
  });

  const fetchCertifications = async () => {
    try {
      setLoading(true);
      const response = await get(
        `/api/provider/certifications?providerId=${providerId}`,
      );
      if (response) {
        setCertifications(response.certifications || []);
      }
    } catch (error) {
      console.error("Error fetching certifications:", error);
      toast.error("Erreur lors du chargement des certifications");
    } finally {
      setLoading(false);
    }
  };

  const saveCertification = async () => {
    try {
      const endpoint = editingCert
        ? `/api/provider/certifications/${editingCert.id}`
        : "/api/provider/certifications";

      const method = editingCert ? put : post;

      const response = await method(endpoint, {
        body: JSON.stringify({
          providerId,
          ...formData,
        }),
      });

      if (response) {
        toast.success(
          editingCert ? "Certification mise à jour" : "Certification ajoutée",
        );
        setShowDialog(false);
        resetForm();
        fetchCertifications();
      }
    } catch (error) {
      console.error("Error saving certification:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const uploadDocument = async (certificationId: string, file: File) => {
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "CERTIFICATION");
      formData.append("category", "document");
      formData.append("documentId", certificationId); // Utiliser documentId au lieu de certificationId

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Document téléchargé avec succès");
        fetchCertifications();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors du téléchargement");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploadingFile(false);
    }
  };

  const requestValidation = async (certificationId: string) => {
    try {
      const response = await post(
        `/api/provider/certifications/${certificationId}/validate`,
        {
          body: JSON.stringify({ providerId }),
        },
      );

      if (response) {
        toast.success("Demande de validation envoyée");
        fetchCertifications();
      }
    } catch (error) {
      console.error("Error requesting validation:", error);
      toast.error("Erreur lors de la demande de validation");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      issuingOrganization: "",
      certificationNumber: "",
      issuedDate: "",
      expirationDate: "",
      serviceTypes: [],
    });
    setEditingCert(null);
  };

  const editCertification = (cert: Certification) => {
    setFormData({
      name: cert.name,
      type: cert.type,
      issuingOrganization: cert.issuingOrganization,
      certificationNumber: cert.certificationNumber,
      issuedDate: cert.issuedDate.split("T")[0],
      expirationDate: cert.expirationDate
        ? cert.expirationDate.split("T")[0]
        : "",
      serviceTypes: cert.serviceTypes || [],
    });
    setEditingCert(cert);
    setShowDialog(true);
  };

  const getStatusBadge = (status: string, expirationDate?: string) => {
    if (expirationDate && new Date(expirationDate) < new Date()) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expirée
        </Badge>
      );
    }

    const config = {
      PENDING: {
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        label: "En attente",
      },
      APPROVED: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Validée",
      },
      REJECTED: {
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
        label: "Rejetée",
      },
    };

    const statusConfig =
      config[status as keyof typeof config] || config.PENDING;
    const Icon = statusConfig.icon;

    return (
      <Badge className={statusConfig.color}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getMissingRequiredCertifications = () => {
    return requiredCerts.filter(
      (required) =>
        required.isCompulsory &&
        !certifications.some(
          (cert) =>
            cert.type === required.type && cert.validationStatus === "APPROVED",
        ),
    );
  };

  useEffect(() => {
    fetchCertifications();
  }, [providerId]);

  if (loading) {
    return (
      <div className="space-y-4">
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
    );
  }

  const missingCerts = getMissingRequiredCertifications();

  return (
    <div className="space-y-6">
      {/* Missing Required Certifications Alert */}
      {missingCerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>Certifications obligatoires manquantes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingCerts.map((cert) => (
                <div
                  key={cert.type}
                  className="flex items-center justify-between p-3 bg-white rounded border"
                >
                  <div>
                    <p className="font-medium text-red-800">{cert.name}</p>
                    <p className="text-sm text-red-600">{cert.description}</p>
                  </div>
                  <Badge variant="destructive">Obligatoire</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            Habilitations et certifications
          </h3>
          <p className="text-gray-600">
            Vérification rigoureuse de vos habilitations selon les exigences
            EcoDeli
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle certification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCert
                  ? "Modifier la certification"
                  : "Nouvelle certification"}
              </DialogTitle>
              <DialogDescription>
                Ajoutez vos certifications et habilitations professionnelles
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom de la certification</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Permis de conduire B"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CERTIFICATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center space-x-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issuingOrganization">
                    Organisme émetteur
                  </Label>
                  <Input
                    id="issuingOrganization"
                    value={formData.issuingOrganization}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        issuingOrganization: e.target.value,
                      })
                    }
                    placeholder="Ex: Préfecture de Paris"
                  />
                </div>
                <div>
                  <Label htmlFor="certificationNumber">Numéro</Label>
                  <Input
                    id="certificationNumber"
                    value={formData.certificationNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        certificationNumber: e.target.value,
                      })
                    }
                    placeholder="Numéro de certification"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issuedDate">Date d'émission</Label>
                  <Input
                    id="issuedDate"
                    type="date"
                    value={formData.issuedDate}
                    onChange={(e) =>
                      setFormData({ ...formData, issuedDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="expirationDate">
                    Date d'expiration (optionnel)
                  </Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expirationDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button onClick={saveCertification}>
                {editingCert ? "Modifier" : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Required Certifications Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Certifications requises</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredCerts.map((required) => {
              const userCert = certifications.find(
                (cert) => cert.type === required.type,
              );
              const isCompliant =
                userCert && userCert.validationStatus === "APPROVED";

              return (
                <div
                  key={required.type}
                  className={`p-4 border rounded-lg ${isCompliant ? "border-green-200 bg-green-50" : "border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{required.name}</h4>
                    {isCompliant ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {required.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        required.isCompulsory ? "destructive" : "secondary"
                      }
                    >
                      {required.isCompulsory ? "Obligatoire" : "Recommandée"}
                    </Badge>
                    {userCert &&
                      getStatusBadge(
                        userCert.validationStatus,
                        userCert.expirationDate,
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* User Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="w-5 h-5" />
            <span>Mes certifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certifications.length === 0 ? (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune certification ajoutée
              </h3>
              <p className="text-gray-600 mb-4">
                Ajoutez vos certifications pour valider votre profil
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter ma première certification
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {certifications.map((cert) => (
                <div key={cert.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{cert.name}</h4>
                        {getStatusBadge(
                          cert.validationStatus,
                          cert.expirationDate,
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Organisme:</span>
                          <p className="font-medium">
                            {cert.issuingOrganization}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Numéro:</span>
                          <p className="font-medium">
                            {cert.certificationNumber}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Émise le:</span>
                          <p className="font-medium">
                            {new Date(cert.issuedDate).toLocaleDateString()}
                          </p>
                        </div>
                        {cert.expirationDate && (
                          <div>
                            <span className="text-gray-600">Expire le:</span>
                            <p className="font-medium">
                              {new Date(
                                cert.expirationDate,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {cert.validationStatus === "REJECTED" &&
                        cert.validationNotes && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-sm text-red-800">
                              <strong>Motif de rejet:</strong>{" "}
                              {cert.validationNotes}
                            </p>
                          </div>
                        )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editCertification(cert)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {!cert.documentUrl ? (
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                uploadDocument(cert.id, file);
                              }
                            }}
                            className="hidden"
                            id={`file-upload-${cert.id}`}
                          />
                          <label
                            htmlFor={`file-upload-${cert.id}`}
                            className="cursor-pointer"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={uploadingFile}
                              type="button"
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </label>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(cert.documentUrl, "_blank")
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}

                      {cert.validationStatus !== "APPROVED" &&
                        cert.documentUrl && (
                          <Button
                            size="sm"
                            onClick={() => requestValidation(cert.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
