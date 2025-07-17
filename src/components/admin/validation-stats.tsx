"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  FileText,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface ValidationStats {
  pending: number;
  approved: number;
  rejected: number;
  deliverersPending: number;
  providersPending: number;
  merchantsPending: number;
  totalDocuments: number;
  weeklyValidations: number;
  averageValidationTime: number;
}

export function ValidationStatsWidget() {
  const [stats, setStats] = useState<ValidationStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    deliverersPending: 0,
    providersPending: 0,
    merchantsPending: 0,
    totalDocuments: 0,
    weeklyValidations: 0,
    averageValidationTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/documents/validate?status=PENDING");
      const data = await response.json();
      
      if (response.ok && data.stats) {
        setStats({
          ...data.stats,
          totalDocuments: data.stats.pending + data.stats.approved + data.stats.rejected,
          weeklyValidations: data.stats.approved, // Simulation
          averageValidationTime: 2.5, // Simulation en jours
          merchantsPending: 0, // À ajouter si nécessaire
        });
      }
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getApprovalRate = () => {
    const total = stats.approved + stats.rejected;
    return total > 0 ? Math.round((stats.approved / total) * 100) : 0;
  };

  const getPendingRate = () => {
    return stats.totalDocuments > 0 
      ? Math.round((stats.pending / stats.totalDocuments) * 100) 
      : 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Validés</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejetés</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux d'approbation</p>
                <p className="text-2xl font-bold text-blue-600">{getApprovalRate()}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Validation des documents
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/documents">
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Documents en attente</span>
              <span>{stats.pending} / {stats.totalDocuments}</span>
            </div>
            <Progress value={getPendingRate()} className="h-2" />
          </div>

          {/* By Role */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Livreurs</span>
                <Badge variant="secondary">{stats.deliverersPending}</Badge>
              </div>
              <p className="text-xs text-gray-600">Documents en attente</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Prestataires</span>
                <Badge variant="secondary">{stats.providersPending}</Badge>
              </div>
              <p className="text-xs text-gray-600">Documents en attente</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Commerçants</span>
                <Badge variant="secondary">{stats.merchantsPending}</Badge>
              </div>
              <p className="text-xs text-gray-600">Documents en attente</p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Validations cette semaine</p>
                <p className="text-2xl font-bold">{stats.weeklyValidations}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Temps moyen de validation</p>
                <p className="text-2xl font-bold">{stats.averageValidationTime}j</p>
              </div>
            </div>
          </div>

          {/* Action Items */}
          {stats.pending > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <p className="font-medium text-orange-800">
                    {stats.pending} document(s) en attente de validation
                  </p>
                  <p className="text-sm text-orange-600">
                    Des utilisateurs attendent la validation de leurs documents
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}