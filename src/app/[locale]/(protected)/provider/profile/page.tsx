"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/i18n/navigation";
import { 
  User, 
  FileText, 
  Award,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Upload,
  Plus
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProfileOverview {
  completionRate: number;
  isVerified: boolean;
  documentsStatus: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  certificationsCount: number;
  profileStrength: 'WEAK' | 'MEDIUM' | 'STRONG';
  missingElements: string[];
}

export default function ProviderProfilePage() {
  const { user } = useAuth();
  const t = useTranslations("provider.profile");
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileOverview = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/provider/profile/overview?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setOverview(data);
        }
      } catch (error) {
        console.error("Error fetching profile overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileOverview();
  }, [user]);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'STRONG':
        return 'text-green-600';
      case 'MEDIUM':
        return 'text-yellow-600';
      case 'WEAK':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case 'STRONG':
        return <Badge className="bg-green-100 text-green-800">Fort</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800">Moyen</Badge>;
      case 'WEAK':
        return <Badge variant="destructive">Faible</Badge>;
      default:
        return <Badge variant="secondary">Non défini</Badge>;
    }
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

  if (!user || !overview) {
    return (
      <div className="text-center py-8">
        <p>Impossible de charger les informations du profil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon Profil"
        description="Vue d'ensemble de votre profil et progression"
      />

      {/* Profile Strength Alert */}
      {overview.profileStrength !== 'STRONG' && (
        <Alert className={overview.profileStrength === 'WEAK' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
          <AlertCircle className={`h-4 w-4 ${overview.profileStrength === 'WEAK' ? 'text-red-600' : 'text-yellow-600'}`} />
          <AlertDescription className={overview.profileStrength === 'WEAK' ? 'text-red-800' : 'text-yellow-800'}>
            Votre profil n'est pas encore optimisé. Complétez les sections manquantes pour améliorer votre visibilité.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Completion Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Complétion du Profil
            </div>
            {getStrengthBadge(overview.profileStrength)}
          </CardTitle>
          <CardDescription>
            Votre progression vers un profil complet et vérifié
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progression globale</span>
            <span className="text-sm text-muted-foreground">{overview.completionRate}%</span>
          </div>
          <Progress value={overview.completionRate} className="w-full" />
          
          {overview.missingElements.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Éléments manquants:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {overview.missingElements.map((element, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    {element}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Personnelles
            </CardTitle>
            <CardDescription>
              Gérez vos données personnelles et de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Profil vérifié</span>
              {overview.isVerified ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <Button asChild className="w-full">
              <Link href="/provider/profile/info">
                <Edit className="h-4 w-4 mr-2" />
                Modifier mes informations
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>
              Gérez vos documents de validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Approuvés</span>
                <Badge variant="outline" className="text-green-600">
                  {overview.documentsStatus.approved}/{overview.documentsStatus.total}
                </Badge>
              </div>
              {overview.documentsStatus.pending > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>En attente</span>
                  <Badge variant="outline" className="text-yellow-600">
                    {overview.documentsStatus.pending}
                  </Badge>
                </div>
              )}
              {overview.documentsStatus.rejected > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Rejetés</span>
                  <Badge variant="outline" className="text-red-600">
                    {overview.documentsStatus.rejected}
                  </Badge>
                </div>
              )}
            </div>
            <Button asChild className="w-full" variant={overview.documentsStatus.pending > 0 ? "default" : "outline"}>
              <Link href="/provider/profile/documents">
                <Upload className="h-4 w-4 mr-2" />
                {overview.documentsStatus.pending > 0 ? 'Documents en attente' : 'Gérer les documents'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <CardDescription>
              Vos qualifications professionnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Certifications</span>
              <Badge variant="outline">
                {overview.certificationsCount}
              </Badge>
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link href="/provider/profile/certifications">
                <Plus className="h-4 w-4 mr-2" />
                Gérer les certifications
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Profile Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Conseils pour Optimiser votre Profil</CardTitle>
          <CardDescription>
            Suivez ces recommandations pour améliorer votre visibilité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">✅ Bonnes pratiques</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Photo de profil professionnelle</li>
                <li>• Description détaillée de vos services</li>
                <li>• Tous les documents requis validés</li>
                <li>• Certifications à jour</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">💡 Conseils d'amélioration</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Ajoutez vos spécialités</li>
                <li>• Configurez vos disponibilités</li>
                <li>• Maintenez vos certifications</li>
                <li>• Répondez rapidement aux clients</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider/profile/info">
                Modifier le profil
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider/calendar">
                Disponibilités
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider/services">
                Mes services
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider/earnings">
                Mes gains
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 