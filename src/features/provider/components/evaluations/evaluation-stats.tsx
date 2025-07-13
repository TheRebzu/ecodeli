"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EvaluationStatsProps {
  providerId: string;
}

interface DetailedStats {
  overall: {
    averageRating: number;
    totalEvaluations: number;
    medianRating: number;
    standardDeviation: number;
  };
  byService: {
    serviceType: string;
    averageRating: number;
    totalEvaluations: number;
    trend: number;
  }[];
  byMonth: {
    month: string;
    averageRating: number;
    totalEvaluations: number;
    trend: number;
  }[];
  qualitative: {
    topKeywords: {
      word: string;
      count: number;
      sentiment: "positive" | "negative" | "neutral";
    }[];
    improvementAreas: string[];
    strengths: string[];
  };
}

export function ProviderEvaluationStats({ providerId }: EvaluationStatsProps) {
  const t = useTranslations("provider.evaluations.stats");
  const { get } = useApi();
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("6months");

  const fetchDetailedStats = async () => {
    try {
      setLoading(true);
      const response = await get(
        `/api/provider/evaluations/stats?providerId=${providerId}&period=${selectedPeriod}`,
      );
      if (response) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching detailed stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportStats = async () => {
    try {
      const response = await get(
        `/api/provider/evaluations/export?providerId=${providerId}&period=${selectedPeriod}`,
      );
      if (response) {
        // Handle PDF download
        const blob = new Blob([response], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `evaluations-stats-${selectedPeriod}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting stats:", error);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  useEffect(() => {
    fetchDetailedStats();
  }, [providerId, selectedPeriod]);

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

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Données insuffisantes
            </h3>
            <p className="text-gray-600">
              Réalisez plus d'interventions pour accéder aux statistiques
              détaillées
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Analyse détaillée des performances
        </h3>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1month">1 mois</option>
            <option value="3months">3 mois</option>
            <option value="6months">6 mois</option>
            <option value="1year">1 an</option>
          </select>
          <Button onClick={exportStats} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(stats.overall.averageRating))}
              </div>
              <p className="text-2xl font-bold">
                {stats.overall.averageRating.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Note moyenne</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {stats.overall.totalEvaluations}
              </p>
              <p className="text-sm text-gray-600">Évaluations totales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {stats.overall.medianRating.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Note médiane</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {stats.overall.standardDeviation.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Écart-type</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList>
          <TabsTrigger value="services">Par service</TabsTrigger>
          <TabsTrigger value="temporal">Évolution temporelle</TabsTrigger>
          <TabsTrigger value="qualitative">Analyse qualitative</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance par type de service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.byService.map((service, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-medium">{service.serviceType}</h4>
                        <div className="flex items-center space-x-2">
                          {renderStars(Math.round(service.averageRating))}
                          <span className="text-sm text-gray-600">
                            {service.averageRating.toFixed(2)} (
                            {service.totalEvaluations} avis)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {service.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm ${service.trend >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {service.trend >= 0 ? "+" : ""}
                        {service.trend.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temporal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution mensuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.byMonth.map((month, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center space-x-4">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{month.month}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span>{month.averageRating.toFixed(2)}</span>
                      <span className="text-sm text-gray-600">
                        ({month.totalEvaluations} avis)
                      </span>
                      <div className="flex items-center space-x-1">
                        {month.trend >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={`text-sm ${month.trend >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {month.trend >= 0 ? "+" : ""}
                          {month.trend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualitative" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Mots-clés fréquents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.qualitative.topKeywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span
                        className={`text-sm ${getSentimentColor(keyword.sentiment)}`}
                      >
                        {keyword.word}
                      </span>
                      <Badge variant="outline">{keyword.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Points forts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.qualitative.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Axes d'amélioration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.qualitative.improvementAreas.map((area, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
