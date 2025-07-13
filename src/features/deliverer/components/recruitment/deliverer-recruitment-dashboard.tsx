"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle,
  ArrowRight,
  Loader2,
  TrendingUp,
  Package,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface DashboardStats {
  activeDeliveries: number;
  monthlyEarnings: number;
  averageRating: number;
  totalDeliveries: number;
  pendingRequests: number;
}

interface CandidacyStatus {
  status: string;
  message: string;
}

export function DelivererDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [candidacyStatus, setCandidacyStatus] = useState<CandidacyStatus>({
    status: "DRAFT",
    message: "Votre candidature est en cours de préparation.",
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Récupérer les statistiques du dashboard
      const statsResponse = await fetch("/api/deliverer/dashboard/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Récupérer le statut de candidature
      const candidacyResponse = await fetch(
        `/api/deliverer/recruitment?userId=${user?.id}`,
      );
      if (candidacyResponse.ok) {
        const candidacyData = await candidacyResponse.json();
        if (candidacyData.application) {
          updateCandidacyStatus(candidacyData.application.status);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du dashboard:", error);
      toast.error("Impossible de charger les données du dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateCandidacyStatus = (status: string) => {
    const statusConfig = {
      DRAFT: {
        status: "DRAFT",
        message:
          "Votre candidature est en cours de préparation. Complétez tous les documents requis.",
      },
      SUBMITTED: {
        status: "SUBMITTED",
        message:
          "Votre candidature a été soumise et est en cours d'examen par notre équipe.",
      },
      APPROVED: {
        status: "APPROVED",
        message:
          "Votre candidature a été validée. Vous pouvez maintenant accepter des livraisons.",
      },
      REJECTED: {
        status: "REJECTED",
        message:
          "Votre candidature a été rejetée. Veuillez consulter les détails dans la section documents.",
      },
    };

    setCandidacyStatus(
      statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT,
    );
  };

  const getCandidacyStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-50 border-green-200";
      case "REJECTED":
        return "bg-red-50 border-red-200";
      case "SUBMITTED":
        return "bg-blue-50 border-blue-200";
      case "DRAFT":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getCandidacyStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "REJECTED":
        return <FileText className="w-5 h-5 text-red-600" />;
      case "SUBMITTED":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "DRAFT":
        return <FileText className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de Bord Livreur</h1>
        <p className="text-muted-foreground">
          Gérez vos livraisons et votre profil
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getCandidacyStatusIcon(candidacyStatus.status)}
            Statut de votre candidature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`p-4 rounded-lg border ${getCandidacyStatusColor(candidacyStatus.status)}`}
          >
            <p
              className={
                candidacyStatus.status === "APPROVED"
                  ? "text-green-800"
                  : candidacyStatus.status === "REJECTED"
                    ? "text-red-800"
                    : candidacyStatus.status === "SUBMITTED"
                      ? "text-blue-800"
                      : "text-yellow-800"
              }
            >
              {candidacyStatus.message}
            </p>
            <Link href="/fr/deliverer/documents">
              <Button
                variant="outline"
                className="bg-white hover:bg-green-100 mt-4"
              >
                <FileText className="w-4 h-4 mr-2" />
                Voir mes documents
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Livraisons en cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.activeDeliveries}
              </div>
              <p className="text-sm text-muted-foreground">
                Livraisons actives
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Gains du mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                €{stats.monthlyEarnings.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.monthlyEarnings > 0
                  ? "+12% vs mois dernier"
                  : "Aucun gain ce mois"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                Note moyenne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.averageRating.toFixed(1)}/5
              </div>
              <p className="text-sm text-muted-foreground">
                Basé sur {stats.totalDeliveries} livraisons
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/fr/deliverer/opportunities">
              <Button className="w-full justify-start">
                <ArrowRight className="w-4 h-4 mr-2" />
                Voir les opportunités
              </Button>
            </Link>
            <Link href="/fr/deliverer/planning">
              <Button variant="outline" className="w-full justify-start">
                <ArrowRight className="w-4 h-4 mr-2" />
                Mon planning
              </Button>
            </Link>
            <Link href="/fr/deliverer/wallet">
              <Button variant="outline" className="w-full justify-start">
                <ArrowRight className="w-4 h-4 mr-2" />
                Mon portefeuille
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Documents à jour</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Assurance valide</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Profil complet</span>
            </div>
            {stats?.pendingRequests > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-blue-600" />
                <span>{stats.pendingRequests} demandes en attente</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
