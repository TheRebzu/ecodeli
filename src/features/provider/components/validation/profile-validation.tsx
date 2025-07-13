"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";

interface ProfileValidationProps {
  providerId: string;
}

interface ProviderProfile {
  id: string;
  businessName: string;
  siret: string;
  description: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  validationStatus: "PENDING" | "APPROVED" | "REJECTED";
  validationNotes?: string;
  validatedAt?: string;
  documents: {
    id: string;
    type: string;
    filename: string;
    validationStatus: string;
    uploadedAt: string;
  }[];
}

export function ProviderProfileValidation({
  providerId,
}: ProfileValidationProps) {
  const t = useTranslations("provider.validation.profile");
  const { execute } = useApi();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Créer les méthodes GET et POST basées sur execute
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
  const [formData, setFormData] = useState({
    businessName: "",
    siret: "",
    description: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    country: "France",
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await get(
        `/api/provider/validation/profile?providerId=${providerId}`,
      );
      if (response) {
        setProfile(response.profile);
        if (response.profile) {
          setFormData({
            businessName: response.profile.businessName || "",
            siret: response.profile.siret || "",
            description: response.profile.description || "",
            phone: response.profile.phone || "",
            street: response.profile.address?.street || "",
            city: response.profile.address?.city || "",
            postalCode: response.profile.address?.postalCode || "",
            country: response.profile.address?.country || "France",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const response = await post("/api/provider/validation/profile", {
        body: JSON.stringify({
          providerId,
          ...formData,
        }),
      });

      if (response) {
        toast.success("Profil mis à jour avec succès");
        fetchProfile();
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const requestValidation = async () => {
    try {
      const response = await post("/api/provider/validation/profile/submit", {
        body: JSON.stringify({ providerId }),
      });

      if (response) {
        toast.success("Demande de validation envoyée");
        fetchProfile();
      }
    } catch (error) {
      console.error("Error requesting validation:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: {
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        label: "En attente",
      },
      APPROVED: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Validé",
      },
      REJECTED: {
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
        label: "Rejeté",
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

  useEffect(() => {
    fetchProfile();
  }, [providerId]);

  if (loading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Statut de validation du profil</span>
            </div>
            {profile && getStatusBadge(profile.validationStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile?.validationStatus === "APPROVED" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Profil validé</p>
                  <p className="text-sm text-green-600">
                    Validé le{" "}
                    {profile.validatedAt
                      ? new Date(profile.validatedAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {profile?.validationStatus === "REJECTED" &&
            profile.validationNotes && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Profil rejeté</p>
                    <p className="text-sm text-red-600 mt-1">
                      {profile.validationNotes}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {profile?.validationStatus === "PENDING" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">
                    En cours de validation
                  </p>
                  <p className="text-sm text-yellow-600">
                    Votre profil est en cours d'examen par notre équipe
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Informations professionnelles</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessName">Nom de l'entreprise</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                placeholder="Votre raison sociale"
              />
            </div>
            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                value={formData.siret}
                onChange={(e) =>
                  setFormData({ ...formData, siret: e.target.value })
                }
                placeholder="123 456 789 00012"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description de l'activité</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Décrivez votre activité et vos services..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone professionnel</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="01 23 45 67 89"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Adresse professionnelle</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="street">Adresse</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) =>
                setFormData({ ...formData, street: e.target.value })
              }
              placeholder="123 rue de la République"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Paris"
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                placeholder="75001"
              />
            </div>
            <div>
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                placeholder="France"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Documents justificatifs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile?.documents && profile.documents.length > 0 ? (
            <div className="space-y-3">
              {profile.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{doc.filename}</p>
                      <p className="text-sm text-gray-600">
                        Téléchargé le{" "}
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(doc.validationStatus)}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun document
              </h3>
              <p className="text-gray-600 mb-4">
                Téléchargez vos documents justificatifs pour la validation
              </p>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Télécharger un document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex space-x-4">
        <Button onClick={saveProfile} disabled={saving}>
          {saving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            "Sauvegarder"
          )}
        </Button>

        {profile?.validationStatus !== "APPROVED" && (
          <Button variant="outline" onClick={requestValidation}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Demander la validation
          </Button>
        )}
      </div>
    </div>
  );
}
