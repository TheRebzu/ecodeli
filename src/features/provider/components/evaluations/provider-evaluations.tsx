"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Evaluation {
  id: string;
  serviceId: string;
  serviceName: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  response?: string;
  respondedAt?: string;
}

interface EvaluationStats {
  averageRating: number;
  totalEvaluations: number;
  ratingDistribution: Record<number, number>;
  monthlyAverage: number;
  previousMonthAverage: number;
  trend: "up" | "down" | "stable";
  recentEvaluations: Evaluation[];
}

export function ProviderEvaluations() {
  const t = useTranslations("provider.evaluations");
  const { user } = useAuth();
  const { execute } = useApi();

  const get = async (url: string) => {
    return await execute(url, { method: "GET" });
  };
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");

  useEffect(() => {
    fetchEvaluations();
  }, [user?.id]);

  const fetchEvaluations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [statsResponse, evaluationsResponse] = await Promise.all([
        get(`/api/provider/evaluations/stats?providerId=${user.id}`),
        get(`/api/provider/evaluations?providerId=${user.id}`),
      ]);

      if (statsResponse) {
        setStats(statsResponse);
      }
      if (evaluationsResponse) {
        setEvaluations(evaluationsResponse.evaluations || []);
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredEvaluations = evaluations.filter((evaluation) => {
    if (filter === "positive") return evaluation.rating >= 4;
    if (filter === "negative") return evaluation.rating <= 2;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
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
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getRatingColor(stats?.averageRating || 0)}`}
            >
              {stats?.averageRating.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Sur {stats?.totalEvaluations} évaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ce mois-ci</CardTitle>
            {stats?.trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : stats?.trend === "down" ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <Award className="h-4 w-4 text-gray-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.monthlyAverage.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.trend === "up" ? "+" : stats?.trend === "down" ? "-" : ""}
              {Math.abs(
                (stats?.monthlyAverage || 0) -
                  (stats?.previousMonthAverage || 0),
              ).toFixed(1)}{" "}
              vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Award className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats
                ? Math.round(
                    ((stats.ratingDistribution[5] +
                      stats.ratingDistribution[4]) /
                      stats.totalEvaluations) *
                      100,
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Clients satisfaits (4-5 étoiles)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À améliorer</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats
                ? stats.ratingDistribution[1] + stats.ratingDistribution[2]
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Évaluations négatives
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution des notes */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Distribution des notes</CardTitle>
            <CardDescription>
              Répartition des évaluations par nombre d'étoiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage =
                  stats.totalEvaluations > 0
                    ? (count / stats.totalEvaluations) * 100
                    : 0;

                return (
                  <div key={rating} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <Progress value={percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-12">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des évaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Évaluations récentes</CardTitle>
          <CardDescription>
            Les avis de vos clients sur vos prestations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" onClick={() => setFilter("all")}>
                Toutes ({evaluations.length})
              </TabsTrigger>
              <TabsTrigger
                value="positive"
                onClick={() => setFilter("positive")}
              >
                Positives ({evaluations.filter((e) => e.rating >= 4).length})
              </TabsTrigger>
              <TabsTrigger
                value="negative"
                onClick={() => setFilter("negative")}
              >
                Négatives ({evaluations.filter((e) => e.rating <= 2).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="space-y-4 mt-6">
              {filteredEvaluations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Aucune évaluation dans cette catégorie
                  </p>
                </div>
              ) : (
                filteredEvaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={evaluation.clientAvatar} />
                          <AvatarFallback>
                            {evaluation.clientName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {evaluation.clientName}
                            </h4>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < evaluation.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {evaluation.serviceName} •{" "}
                            {format(
                              new Date(evaluation.createdAt),
                              "d MMMM yyyy",
                              { locale: fr },
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          evaluation.rating >= 4
                            ? "default"
                            : evaluation.rating >= 3
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {evaluation.rating}/5
                      </Badge>
                    </div>

                    {evaluation.comment && (
                      <p className="text-sm">{evaluation.comment}</p>
                    )}

                    {evaluation.response ? (
                      <div className="bg-gray-50 rounded p-3 mt-2">
                        <p className="text-sm font-medium mb-1">
                          Votre réponse :
                        </p>
                        <p className="text-sm text-gray-600">
                          {evaluation.response}
                        </p>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Répondre
                      </Button>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">
            Impact des évaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              • Les évaluations influencent votre visibilité sur la plateforme
            </li>
            <li>
              • Une note moyenne supérieure à 4.5/5 vous donne accès aux clients
              Premium
            </li>
            <li>
              • Répondez aux évaluations négatives pour montrer votre
              professionnalisme
            </li>
            <li>
              • Les évaluations sont prises en compte dans les négociations
              tarifaires avec EcoDeli
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
