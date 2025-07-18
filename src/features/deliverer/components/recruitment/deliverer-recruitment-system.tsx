"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import {
  User,
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Car,
  Bike,
  Truck,
  Calendar,
  CreditCard,
  Shield,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface DelivererRecruitmentSystemProps {
  userId: string;
}

interface RecruitmentApplication {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    nationality: string;
  };
  professionalInfo: {
    vehicleType: "CAR" | "BIKE" | "SCOOTER" | "TRUCK" | "WALKING";
    vehicleModel: string;
    licenseNumber: string;
    experience: number;
    availability: string[];
    preferredZones: string[];
  };
  documents: RecruitmentDocument[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  validationProgress: number;
}

interface RecruitmentDocument {
  id: string;
  type:
    | "IDENTITY"
    | "DRIVING_LICENSE"
    | "INSURANCE"
    | "CERTIFICATION"
    | "CONTRACT"
    | "OTHER";
  name: string;
  fileName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt: string;
  rejectionReason?: string;
  downloadUrl?: string;
}

export default function DelivererRecruitmentSystem({
  userId,
}: DelivererRecruitmentSystemProps) {
  const t = useTranslations("deliverer.recruitment");
  const router = useRouter();
  const { user } = useAuth();
  const [application, setApplication] = useState<RecruitmentApplication | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    nationality: "",
    vehicleType: "",
    vehicleModel: "",
    licenseNumber: "",
    experience: 0,
    availability: [] as string[],
    preferredZones: [] as string[],
  });

  // Redirection automatique pour les utilisateurs déjà validés
  useEffect(() => {
    console.log('🔍 [RECRUITMENT] User status check:', {
      userId: user?.id,
      role: user?.role,
      validationStatus: user?.validationStatus,
      isActive: user?.isActive
    });
    
    // Auto-sync validation status for deliverers
    const syncValidationStatus = async () => {
      if (user && user.role === 'DELIVERER' && user.validationStatus === 'PENDING') {
        console.log('🔄 [RECRUITMENT] Tentative de synchronisation du statut de validation...');
        try {
          const response = await fetch('/api/auth/sync-validation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('📋 [RECRUITMENT] Résultat sync:', result);
            
            if (result.updated && result.freshValidationStatus === 'VALIDATED') {
               console.log('✅ [RECRUITMENT] Statut synchronisé - redirection vers dashboard');
               toast({
                 title: "Validation terminée !",
                 description: "Votre compte a été automatiquement validé. Redirection en cours...",
               });
               
               // Attendre un peu pour que l'utilisateur voie le toast
               setTimeout(() => {
                 if (result.needsRefresh) {
                   // Forcer un rechargement complet pour rafraîchir la session NextAuth
                   window.location.replace('/fr/deliverer');
                 } else {
                   // Simple redirection
                   window.location.href = '/fr/deliverer';
                 }
               }, 1500);
               return;
             }
          }
        } catch (error) {
          console.error('❌ [RECRUITMENT] Erreur sync validation:', error);
        }
      }
    };
    
    if (user && user.role === 'DELIVERER') {
      if (user.validationStatus === 'VALIDATED' || user.validationStatus === 'APPROVED') {
        console.log('✅ [RECRUITMENT] Utilisateur déjà validé - redirection vers dashboard');
        toast({
          title: "Compte déjà validé",
          description: "Redirection vers votre espace livreur...",
        });
        router.push('/fr/deliverer');
        return;
      }
    }
  }, [user, router]);

  useEffect(() => {
    fetchApplication();
    
    // Vérifier le paramètre URL pour forcer la synchronisation
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('check-validation') === 'true') {
      console.log('🔄 [RECRUITMENT] Paramètre check-validation détecté - synchronisation forcée');
      // Nettoyer l'URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('check-validation');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Forcer une synchronisation immédiate
      forceSyncValidation();
    }
  }, [userId]);

  const forceSyncValidation = async () => {
    console.log('🔄 [RECRUITMENT] Synchronisation forcée du statut de validation...');
    try {
      const response = await fetch('/api/auth/sync-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📋 [RECRUITMENT] Résultat sync forcée:', result);
        
        if (result.updated && result.freshValidationStatus === 'VALIDATED') {
          console.log('✅ [RECRUITMENT] Statut synchronisé - redirection immédiate vers dashboard');
          toast({
            title: "Validation terminée !",
            description: "Votre compte a été automatiquement validé. Redirection en cours...",
          });
          
          // Redirection immédiate
          setTimeout(() => {
            window.location.replace('/fr/deliverer');
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ [RECRUITMENT] Erreur sync validation forcée:', error);
    }
  };

  const fetchApplication = async () => {
    setLoading(true);
    try {
      console.log('🔍 [RECRUITMENT] Récupération des données de candidature...');
      
      // Première tentative avec l'API normale
      let response = await fetch(`/api/deliverer/recruitment?userId=${userId}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      // Si erreur, essayer l'API de secours
      if (!response.ok) {
        console.warn('⚠️ [RECRUITMENT] Échec de la récupération via API normale, tentative via API de secours...');
        
        // Essayer l'API de secours qui récupère directement depuis la base de données
        response = await fetch('/api/auth/user-data', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('✅ [RECRUITMENT] Données utilisateur récupérées via API de secours:', userData);
          
          // Convertir les données utilisateur en format d'application
          if (userData.user && userData.user.profileData) {
            const delivererData = userData.user.profileData;
            const profile = userData.user.profile || {};
            
            // Construire un objet application compatible
            const applicationFromUserData = {
              id: delivererData.id || userId,
              status: delivererData.validationStatus || 'PENDING',
              personalInfo: {
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                email: userData.user.email || '',
                phone: profile.phone || '',
                address: profile.address || '',
                dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
                nationality: profile.country || 'FR',
              },
              professionalInfo: {
                vehicleType: delivererData.vehicleType || '',
                vehicleModel: delivererData.licensePlate || '',
                licenseNumber: delivererData.licensePlate || '',
                experience: delivererData.totalDeliveries || 0,
                availability: delivererData.availability || [],
                preferredZones: delivererData.preferredZones || [],
              },
              documents: (userData.user.documents || []).map((doc: any) => ({
                id: doc.id,
                type: doc.type,
                name: getDocumentTypeName(doc.type),
                fileName: doc.filename,
                status: doc.validationStatus,
                uploadedAt: doc.createdAt,
                rejectionReason: doc.rejectionReason,
                downloadUrl: `/api/documents/${doc.id}/download`,
              })),
              createdAt: delivererData.createdAt || new Date().toISOString(),
              updatedAt: delivererData.updatedAt || new Date().toISOString(),
              validationProgress: calculateValidationProgress(userData.user.documents || []),
            };
            
            setApplication(applicationFromUserData);
            setFormData({
              firstName: applicationFromUserData.personalInfo.firstName,
              lastName: applicationFromUserData.personalInfo.lastName,
              email: applicationFromUserData.personalInfo.email,
              phone: applicationFromUserData.personalInfo.phone,
              address: applicationFromUserData.personalInfo.address,
              dateOfBirth: applicationFromUserData.personalInfo.dateOfBirth,
              nationality: applicationFromUserData.personalInfo.nationality,
              vehicleType: applicationFromUserData.professionalInfo.vehicleType,
              vehicleModel: applicationFromUserData.professionalInfo.vehicleModel,
              licenseNumber: applicationFromUserData.professionalInfo.licenseNumber,
              experience: applicationFromUserData.professionalInfo.experience,
              availability: applicationFromUserData.professionalInfo.availability,
              preferredZones: applicationFromUserData.professionalInfo.preferredZones,
            });
            setLoading(false);
            return;
          }
        }
      }
      
      // Continuer avec l'API normale si la réponse est OK ou si l'API de secours a échoué
      const data = await response.json();
      console.log('📋 [RECRUITMENT] Données reçues:', data);
      
      if (data.application) {
        setApplication(data.application);
        setFormData({
          firstName: data.application.personalInfo.firstName,
          lastName: data.application.personalInfo.lastName,
          email: data.application.personalInfo.email,
          phone: data.application.personalInfo.phone,
          address: data.application.personalInfo.address,
          dateOfBirth: data.application.personalInfo.dateOfBirth,
          nationality: data.application.personalInfo.nationality,
          vehicleType: data.application.professionalInfo.vehicleType,
          vehicleModel: data.application.professionalInfo.vehicleModel,
          licenseNumber: data.application.professionalInfo.licenseNumber,
          experience: data.application.professionalInfo.experience,
          availability: data.application.professionalInfo.availability,
          preferredZones: data.application.professionalInfo.preferredZones,
        });
      }
    } catch (error) {
      console.error('❌ [RECRUITMENT] Erreur récupération données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer vos données de candidature. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour calculer le progrès de validation à partir des documents
  const calculateValidationProgress = (documents: any[]) => {
    // Documents obligatoires seulement
    const requiredDocuments = ["IDENTITY", "DRIVING_LICENSE", "INSURANCE"];
    const optionalDocuments = ["OTHER", "CERTIFICATION"];

    // Compter les documents requis uploadés et approuvés
    const uploadedRequiredDocs = documents.filter((d) =>
      requiredDocuments.includes(d.type)
    ).length;
    const approvedRequiredDocs = documents.filter(
      (d) =>
        requiredDocuments.includes(d.type) && d.validationStatus === "APPROVED"
    ).length;

    // Compter les documents optionnels approuvés (bonus)
    const approvedOptionalDocs = documents.filter(
      (d) =>
        optionalDocuments.includes(d.type) && d.validationStatus === "APPROVED"
    ).length;

    // Calcul de la progression
    let validationProgress = 0;
    validationProgress +=
      Math.min(uploadedRequiredDocs / requiredDocuments.length, 1) * 50; // 50% pour upload
    validationProgress +=
      (approvedRequiredDocs / requiredDocuments.length) * 50; // 50% pour approbation

    // Bonus pour documents optionnels approuvés (max 10%)
    const optionalBonus = Math.min(approvedOptionalDocs * 5, 10); // 5% par document optionnel, max 10%
    validationProgress += optionalBonus;

    // Limiter à 100%
    return Math.min(Math.round(validationProgress), 100);
  };

  const saveApplication = async (submit = false) => {
    try {
      const applicationData = {
        userId,
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality,
        },
        professionalInfo: {
          vehicleType: formData.vehicleType,
          vehicleModel: formData.vehicleModel,
          licenseNumber: formData.licenseNumber,
          experience: formData.experience,
          availability: formData.availability,
          preferredZones: formData.preferredZones,
        },
        submit,
      };

      const response = await fetch("/api/deliverer/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData),
      });

      if (response.ok) {
        toast({
          title: submit
            ? t("success.application_submitted")
            : t("success.application_saved"),
          description: submit
            ? t("success.application_submitted_desc")
            : t("success.application_saved_desc"),
        });
        fetchApplication();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save application");
      }
    } catch (error) {
      toast({
        title: t("error.save_failed"),
        description:
          error instanceof Error ? error.message : t("error.generic"),
        variant: "destructive",
      });
    }
  };

  const uploadDocument = async () => {
    if (!uploadFile || !selectedDocumentType) return;

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("type", selectedDocumentType);
    formData.append("userId", userId);

    try {
      const response = await fetch("/api/deliverer/recruitment/documents", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: t("success.document_uploaded"),
          description: t("success.document_uploaded_desc"),
        });
        setShowDocumentDialog(false);
        setUploadFile(null);
        setSelectedDocumentType("");
        fetchApplication();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
    } catch (error) {
      toast({
        title: t("error.upload_failed"),
        description:
          error instanceof Error ? error.message : t("error.generic"),
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/recruitment/documents/${documentId}/download`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: t("error.download_failed"),
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />;
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return <Clock className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      case "DRAFT":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getDocumentTypeName = (type: string) => {
    const types: Record<string, string> = {
      IDENTITY: t("documents.types.identity_card"),
      DRIVING_LICENSE: t("documents.types.driving_license"),
      OTHER: t("documents.types.vehicle_registration"),
      INSURANCE: t("documents.types.insurance"),
      CERTIFICATION: t("documents.types.certification"),
      CONTRACT: t("documents.types.contract"),
    };
    return types[type] || type;
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "CAR":
        return <Car className="h-4 w-4" />;
      case "BIKE":
        return <Bike className="h-4 w-4" />;
      case "TRUCK":
        return <Truck className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const canSubmit = () => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      formData.vehicleType &&
      application?.documents?.length >= 3
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
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
      {/* Manual Sync Button - Only for pending users */}
      {user?.validationStatus === 'PENDING' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-yellow-800">
                  Statut de validation en attente
                </h3>
                <p className="text-sm text-yellow-700">
                  Si votre candidature a été approuvée par un administrateur, vous pouvez forcer une synchronisation.
                </p>
              </div>
              <Button
                onClick={forceSyncValidation}
                variant="outline"
                className="bg-white hover:bg-yellow-100 border-yellow-300"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Vérifier le statut
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      {application && (
        <Card
          className={`border-2 ${
            application.status === "APPROVED"
              ? "border-green-200 bg-green-50"
              : application.status === "REJECTED"
                ? "border-red-200 bg-red-50"
                : application.status === "UNDER_REVIEW"
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("status.application_status")}
              </div>
              <Badge className={getStatusColor(application.status)}>
                {getStatusIcon(application.status)}
                {t(`status.${application.status.toLowerCase()}`)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{t("status.completion_progress")}</span>
                  <span>{application.validationProgress}%</span>
                </div>
                <Progress
                  value={application.validationProgress}
                  className="h-2"
                />
              </div>

              {application.status === "APPROVED" && (
                <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">
                        {t("status.congratulations")}
                      </p>
                      <p className="text-sm">{t("status.approved_message")}</p>
                    </div>
                  </div>
                </div>
              )}

              {application.status === "REJECTED" &&
                application.rejectionReason && (
                  <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
                    <div className="text-red-800">
                      <p className="font-medium">
                        {t("status.rejection_reason")}:
                      </p>
                      <p className="text-sm">{application.rejectionReason}</p>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">{t("tabs.personal_info")}</TabsTrigger>
          <TabsTrigger value="professional">
            {t("tabs.professional_info")}
          </TabsTrigger>
          <TabsTrigger value="documents">{t("tabs.documents")}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("personal.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t("personal.first_name")}</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t("personal.last_name")}</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t("personal.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t("personal.phone")}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">
                    {t("personal.date_of_birth")}
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">
                    {t("personal.nationality")}
                  </Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) =>
                      setFormData({ ...formData, nationality: e.target.value })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">{t("personal.address")}</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={application?.status === "APPROVED"}
                />
              </div>

              {application?.status !== "APPROVED" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveApplication(false)}
                    variant="outline"
                  >
                    {t("actions.save_draft")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                {t("professional.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicleType">
                    {t("professional.vehicle_type")}
                  </Label>
                  <Select
                    value={formData.vehicleType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, vehicleType: value })
                    }
                    disabled={application?.status === "APPROVED"}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("professional.select_vehicle")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAR">{t("vehicles.car")}</SelectItem>
                      <SelectItem value="BIKE">{t("vehicles.bike")}</SelectItem>
                      <SelectItem value="SCOOTER">
                        {t("vehicles.scooter")}
                      </SelectItem>
                      <SelectItem value="TRUCK">
                        {t("vehicles.truck")}
                      </SelectItem>
                      <SelectItem value="WALKING">
                        {t("vehicles.walking")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vehicleModel">
                    {t("professional.vehicle_model")}
                  </Label>
                  <Input
                    id="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleModel: e.target.value })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
                <div>
                  <Label htmlFor="licenseNumber">
                    {t("professional.license_number")}
                  </Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        licenseNumber: e.target.value,
                      })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
                <div>
                  <Label htmlFor="experience">
                    {t("professional.experience")}
                  </Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experience: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={application?.status === "APPROVED"}
                  />
                </div>
              </div>

              {application?.status !== "APPROVED" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveApplication(false)}
                    variant="outline"
                  >
                    {t("actions.save_draft")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("documents.title")}
                {application?.status !== "APPROVED" && (
                  <Button onClick={() => setShowDocumentDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("actions.upload_document")}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!application?.documents || application.documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>{t("documents.empty")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {application.documents.map((document) => (
                    <div key={document.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <h4 className="font-medium">
                              {getDocumentTypeName(document.type)}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {document.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t("documents.uploaded_on")}:{" "}
                              {new Date(
                                document.uploadedAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(document.status)}>
                            {getStatusIcon(document.status)}
                            {t(
                              `documents.statuses.${document.status.toLowerCase()}`,
                            )}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadDocument(document.id, document.fileName)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {document.status === "REJECTED" &&
                        document.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                              <strong>
                                {t("documents.rejection_reason")}:
                              </strong>{" "}
                              {document.rejectionReason}
                            </p>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Application */}
      {application?.status === "DRAFT" && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {t("submit.ready_title")}
              </h3>
              <p className="text-gray-600 mb-4">
                {t("submit.ready_description")}
              </p>
              <Button
                onClick={() => saveApplication(true)}
                disabled={!canSubmit()}
                size="lg"
              >
                {t("actions.submit_application")}
              </Button>
              {!canSubmit() && (
                <p className="text-sm text-red-600 mt-2">
                  {t("submit.requirements_not_met")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Upload Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("upload_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("upload_dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentType">
                {t("upload_dialog.document_type")}
              </Label>
              <Select
                value={selectedDocumentType}
                onValueChange={setSelectedDocumentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("upload_dialog.select_type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDENTITY">
                    {getDocumentTypeName("IDENTITY")}
                  </SelectItem>
                  <SelectItem value="DRIVING_LICENSE">
                    {getDocumentTypeName("DRIVING_LICENSE")}
                  </SelectItem>
                  <SelectItem value="OTHER">
                    {getDocumentTypeName("OTHER")}
                  </SelectItem>
                  <SelectItem value="INSURANCE">
                    {getDocumentTypeName("INSURANCE")}
                  </SelectItem>
                  <SelectItem value="CERTIFICATION">
                    {getDocumentTypeName("CERTIFICATION")}
                  </SelectItem>
                  <SelectItem value="CONTRACT">
                    {getDocumentTypeName("CONTRACT")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="file">{t("upload_dialog.file")}</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDocumentDialog(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={uploadDocument}
              disabled={!uploadFile || !selectedDocumentType}
            >
              {t("actions.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
