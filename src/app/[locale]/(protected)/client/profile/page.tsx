"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  Bell,
  FileText,
  Settings,
  Trash2,
  Plus,
  Edit,
  Upload,
  Download,
  Star,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  lastFour: string;
  brand: string;
  expiryDate: string;
  isDefault: boolean;
}

interface Document {
  id: string;
  name: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt: string;
  url?: string;
}

interface ClientProfile {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    dateOfBirth?: string;
  };
  subscriptionPlan: "FREE" | "STARTER" | "PREMIUM";
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageRating: number;
    completedOrders: number;
    cancelledOrders: number;
    totalReviews: number;
    storageBoxes: number;
  };
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

const subscriptionLabels = {
  FREE: { name: "Gratuit", color: "bg-gray-100 text-gray-800" },
  STARTER: { name: "Starter", color: "bg-blue-100 text-blue-800" },
  PREMIUM: { name: "Premium", color: "bg-yellow-100 text-yellow-800" },
};

const documentTypes = {
  IDENTITY: "Pièce d'identité",
  PROOF_OF_ADDRESS: "Justificatif de domicile",
  DRIVING_LICENSE: "Permis de conduire",
  INSURANCE: "Assurance",
  OTHER: "Autre",
};

const documentStatusLabels = {
  PENDING: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  APPROVED: {
    label: "Approuvé",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejeté",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

export default function ClientProfilePage() {
  const { user } = useAuth();
  const t = useTranslations("client.profile");
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/client/profile?clientId=${user.id}`);

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [editMode, setEditMode] = useState(false);

  // Formulaires
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    dateOfBirth: "",
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: false,
    push: true,
  });

  const handleEditProfile = () => {
    if (profile) {
      setProfileForm({
        name: profile.user.name || "",
        email: profile.user.email || "",
        phone: profile.user.phone || "",
        address: profile.user.address || "",
        city: profile.user.city || "",
        postalCode: profile.user.postalCode || "",
        country: profile.user.country || "",
        dateOfBirth: profile.user.dateOfBirth
          ? profile.user.dateOfBirth.split("T")[0]
          : "",
      });
      setNotificationPrefs(profile.preferences.notifications);
      setEditMode(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updates = {
        ...profileForm,
        preferences: {
          notifications: notificationPrefs,
        },
      };

      const response = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchProfile();
        setEditMode(false);
      } else {
        alert("Erreur lors de la mise à jour");
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        action={
          profile && (
            <Badge
              className={subscriptionLabels[profile.subscriptionPlan].color}
            >
              {subscriptionLabels[profile.subscriptionPlan].name}
            </Badge>
          )
        }
      />

      {isLoading ? (
        <div className="text-center py-8">{t("loading")}</div>
      ) : !profile ? (
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">{t("profile_not_found")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      {t("stats.orders")}
                    </p>
                    <p className="text-2xl font-bold">
                      {profile.stats.totalOrders}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      {t("stats.spent")}
                    </p>
                    <p className="text-2xl font-bold">
                      {profile.stats.totalSpent}€
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Star className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      {t("stats.rating")}
                    </p>
                    <p className="text-2xl font-bold">
                      {profile.stats.averageRating.toFixed(1)}/5
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      {t("stats.deliveries")}
                    </p>
                    <p className="text-2xl font-bold">
                      {profile.stats.completedOrders}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            {/* Onglet Profil */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Informations personnelles</CardTitle>
                    <Button
                      variant="outline"
                      onClick={editMode ? handleSaveProfile : handleEditProfile}
                    >
                      {editMode ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <Edit className="h-4 w-4 mr-2" />
                      )}
                      {editMode ? "Sauvegarder" : "Modifier"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Nom complet</Label>
                      <Input
                        id="name"
                        value={editMode ? profileForm.name : profile.user.name}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            name: e.target.value,
                          })
                        }
                        disabled={!editMode}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={
                          editMode ? profileForm.email : profile.user.email
                        }
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            email: e.target.value,
                          })
                        }
                        disabled={!editMode}
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={
                          editMode
                            ? profileForm.phone
                            : profile.user.phone || ""
                        }
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            phone: e.target.value,
                          })
                        }
                        disabled={!editMode}
                      />
                    </div>

                    <div>
                      <Label htmlFor="dateOfBirth">Date de naissance</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={
                          editMode
                            ? profileForm.dateOfBirth
                            : profile.user.dateOfBirth?.split("T")[0] || ""
                        }
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            dateOfBirth: e.target.value,
                          })
                        }
                        disabled={!editMode}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        value={
                          editMode
                            ? profileForm.address
                            : profile.user.address || ""
                        }
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            address: e.target.value,
                          })
                        }
                        disabled={!editMode}
                      />
                    </div>

                    <div>
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        value={
                          editMode ? profileForm.city : profile.user.city || ""
                        }
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            city: e.target.value,
                          })
                        }
                        disabled={!editMode}
                      />
                    </div>

                    <div>
                      <Label htmlFor="postalCode">Code postal</Label>
                      <Input
                        id="postalCode"
                        value={
                          editMode
                            ? profileForm.postalCode
                            : profile.user.postalCode || ""
                        }
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            postalCode: e.target.value,
                          })
                        }
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Paramètres */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Notifications par email</h4>
                      <p className="text-sm text-gray-600">
                        Recevez les mises à jour par email
                      </p>
                    </div>
                    <Switch
                      checked={
                        editMode
                          ? notificationPrefs.email
                          : profile.preferences.notifications.email
                      }
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          email: checked,
                        })
                      }
                      disabled={!editMode}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Notifications SMS</h4>
                      <p className="text-sm text-gray-600">
                        Recevez les alertes par SMS
                      </p>
                    </div>
                    <Switch
                      checked={
                        editMode
                          ? notificationPrefs.sms
                          : profile.preferences.notifications.sms
                      }
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          sms: checked,
                        })
                      }
                      disabled={!editMode}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Notifications push</h4>
                      <p className="text-sm text-gray-600">
                        Notifications dans le navigateur
                      </p>
                    </div>
                    <Switch
                      checked={
                        editMode
                          ? notificationPrefs.push
                          : profile.preferences.notifications.push
                      }
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          push: checked,
                        })
                      }
                      disabled={!editMode}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sécurité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Changer le mot de passe
                  </Button>

                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Télécharger mes données
                  </Button>

                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer mon compte
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
