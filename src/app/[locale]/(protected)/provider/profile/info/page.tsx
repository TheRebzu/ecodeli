"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Upload,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  Globe,
  Briefcase,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProviderProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  avatar?: string;
  bio: string;
  specialties: string[];
  languages: string[];
  experience: number;
  availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  workingHours: {
    start: string;
    end: string;
  };
  isPublicProfile: boolean;
  joinedAt: string;
  isVerified: boolean;
}

export default function ProviderProfileInfoPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.profile");
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(
          `/api/provider/profile/info?userId=${user.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!profile || !user?.id) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/provider/profile/info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, userId: user.id }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Profil mis à jour avec succès!" });
      } else {
        setMessage({
          type: "error",
          text: "Erreur lors de la mise à jour du profil.",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde." });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProviderProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleAvailabilityChange = (day: string, value: boolean) => {
    if (!profile) return;
    setProfile({
      ...profile,
      availability: { ...profile.availability, [day]: value },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="text-center py-8">
        <p>Impossible de charger les informations du profil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informations du Profil"
        description="Gérez vos informations personnelles et professionnelles"
      />

      {message && (
        <Alert
          className={
            message.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          <AlertDescription
            className={
              message.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture & Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Photo de Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-2xl">
                    {profile.firstName?.[0]}
                    {profile.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Changer la photo
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statut du Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profil vérifié</span>
                <Badge variant={profile.isVerified ? "default" : "secondary"}>
                  {profile.isVerified ? "Vérifié" : "En attente"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Profil public</span>
                <Switch
                  checked={profile.isPublicProfile}
                  onCheckedChange={(checked) =>
                    handleInputChange("isPublicProfile", checked)
                  }
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Membre depuis{" "}
                {new Date(profile.joinedAt).toLocaleDateString("fr-FR")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Personnelles</CardTitle>
              <CardDescription>
                Vos informations de base et de contact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    value={profile.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={profile.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={profile.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input
                      value={profile.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code postal</Label>
                    <Input
                      value={profile.postalCode}
                      onChange={(e) =>
                        handleInputChange("postalCode", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Select
                      value={profile.country}
                      onValueChange={(value) =>
                        handleInputChange("country", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="BE">Belgique</SelectItem>
                        <SelectItem value="CH">Suisse</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Informations Professionnelles
              </CardTitle>
              <CardDescription>
                Votre description et spécialités
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Description / Bio</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Décrivez votre expérience et vos compétences..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Années d'expérience</Label>
                <Select
                  value={profile.experience.toString()}
                  onValueChange={(value) =>
                    handleInputChange("experience", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Débutant</SelectItem>
                    <SelectItem value="1">1 an</SelectItem>
                    <SelectItem value="2">2 ans</SelectItem>
                    <SelectItem value="3">3 ans</SelectItem>
                    <SelectItem value="5">5+ ans</SelectItem>
                    <SelectItem value="10">10+ ans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Disponibilités</CardTitle>
              <CardDescription>
                Configurez vos jours et horaires de travail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(profile.availability).map(
                  ([day, available]) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Switch
                        checked={available}
                        onCheckedChange={(checked) =>
                          handleAvailabilityChange(day, checked)
                        }
                      />
                      <Label className="capitalize">{day}</Label>
                    </div>
                  ),
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heure de début</Label>
                  <Input
                    type="time"
                    value={profile.workingHours.start}
                    onChange={(e) =>
                      handleInputChange("workingHours", {
                        ...profile.workingHours,
                        start: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Heure de fin</Label>
                  <Input
                    type="time"
                    value={profile.workingHours.end}
                    onChange={(e) =>
                      handleInputChange("workingHours", {
                        ...profile.workingHours,
                        end: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
