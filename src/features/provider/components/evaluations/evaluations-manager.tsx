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
  MessageSquare,
  User,
  Calendar,
  BarChart3
} from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface EvaluationsManagerProps {
  providerId: string;
}

interface Evaluation {
  id: string;
  clientName: string;
  serviceType: string;
  rating: number;
  comment?: string;
  date: string;
  interventionDate: string;
  isVerified: boolean;
}

interface EvaluationStats {
  averageRating: number;
  totalEvaluations: number;
  ratingDistribution: { [key: number]: number };
  monthlyTrend: number;
  lastMonthAverage: number;
  responseRate: number;
}

export function ProviderEvaluationsManager({ providerId }: EvaluationsManagerProps) {
  const t = useTranslations("provider.evaluations");
  const { get } = useApi();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const response = await get(`/api/provider/evaluations?providerId=${providerId}`);
      if (response) {
        setEvaluations(response.evaluations || []);
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchEvaluations();
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

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-600">Note moyenne</p>
                  <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total évaluations</p>
                  <p className="text-2xl font-bold">{stats.totalEvaluations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {stats.monthlyTrend >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-gray-600">Tendance mensuelle</p>
                  <p className="text-2xl font-bold">
                    {stats.monthlyTrend >= 0 ? "+" : ""}{stats.monthlyTrend.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Taux de réponse</p>
                  <p className="text-2xl font-bold">{stats.responseRate.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Répartition des notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage = stats.totalEvaluations > 0 
                  ? (count / stats.totalEvaluations) * 100 
                  : 0;

                return (
                  <div key={rating} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 w-20">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Évaluations récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune évaluation
              </h3>
              <p className="text-gray-600">
                Vos clients pourront évaluer vos prestations après réalisation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <div key={evaluation.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{evaluation.clientName}</span>
                        <Badge variant="outline">{evaluation.serviceType}</Badge>
                        {evaluation.isVerified && (
                          <Badge variant="default">Vérifié</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 mb-2">
                        {renderStars(evaluation.rating)}
                        <span className="text-sm text-gray-600 ml-2">
                          {evaluation.rating}/5
                        </span>
                      </div>

                      {evaluation.comment && (
                        <p className="text-gray-700 mb-2">{evaluation.comment}</p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Intervention: {new Date(evaluation.interventionDate).toLocaleDateString()}</span>
                        </div>
                        <span>Évalué le: {new Date(evaluation.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline">
          <BarChart3 className="w-4 h-4 mr-2" />
          Voir les statistiques détaillées
        </Button>
      </div>
    </div>
  );
}