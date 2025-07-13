"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  MessageSquare,
  Star,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

export function ModerationDashboard() {
  const stats = {
    pendingReviews: 12,
    totalReports: 45,
    approvedContent: 156,
    rejectedContent: 23,
    activeSanctions: 8,
    averageResponseTime: "2.5h",
  };

  const recentActivity = [
    {
      id: "1",
      type: "ANNOUNCEMENT",
      title: "Annonce signalée",
      status: "PENDING",
      reportedBy: "user123",
      createdAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      type: "REVIEW",
      title: "Avis inapproprié",
      status: "REVIEWED",
      reportedBy: "user456",
      createdAt: "2024-01-15T09:15:00Z",
    },
    {
      id: "3",
      type: "COMMENT",
      title: "Commentaire spam",
      status: "REJECTED",
      reportedBy: "user789",
      createdAt: "2024-01-15T08:45:00Z",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case "REVIEWED":
        return (
          <Badge variant="outline">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Examiné
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approuvé
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ANNOUNCEMENT":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "REVIEW":
        return <Star className="h-4 w-4 text-yellow-500" />;
      case "COMMENT":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      default:
        return <Flag className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  En attente
                </p>
                <p className="text-2xl font-bold">{stats.pendingReviews}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Signalements
                </p>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
              </div>
              <Flag className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approuvés
                </p>
                <p className="text-2xl font-bold">{stats.approvedContent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rejetés
                </p>
                <p className="text-2xl font-bold">{stats.rejectedContent}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sanctions
                </p>
                <p className="text-2xl font-bold">{stats.activeSanctions}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Temps réponse
                </p>
                <p className="text-2xl font-bold">
                  {stats.averageResponseTime}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTypeIcon(activity.type)}
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Signalé par {activity.reportedBy} •{" "}
                      {new Date(activity.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
                {getStatusBadge(activity.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
