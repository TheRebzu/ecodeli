"use client";

import React from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DownloadIcon,
  PlusIcon,
  UsersIcon,
  EyeIcon,
  EditIcon,
  BanIcon,
  LoaderIcon,
  RefreshCcwIcon,
  Store,
  Package,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Mail,
  Phone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

// Fonctions de formatage
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"}).format(amount);
};

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"}).format(dateObj);
};

interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  subscriptionPlan: string;
  createdAt: Date;
  lastActivity?: Date;
  totalOrders: number;
  monthlyRevenue: number;
}

async function MerchantsPage() {
  try {
    // Récupération des vrais données marchands depuis l'API
    const merchants = await api.admin.merchants.getAll();
    const stats = await api.admin.merchants.getStats();

    const getStatusColor = (status: Merchant["status"]) => {
      switch (status) {
        case "approved":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        case "pending":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
        case "rejected":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
        case "suspended":
          return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      }
    };

    const getStatusLabel = (status: Merchant["status"]) => {
      switch (status) {
        case "approved":
          return "Approuvé";
        case "pending":
          return "En attente";
        case "rejected":
          return "Rejeté";
        case "suspended":
          return "Suspendu";
        default:
          return "Inconnu";
      }
    };

    const getStatusIcon = (status: Merchant["status"]) => {
      switch (status) {
        case "approved":
          return CheckCircle;
        case "pending":
          return Clock;
        case "rejected":
        case "suspended":
          return AlertCircle;
        default:
          return AlertCircle;
      }
    };

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestion des marchands</h1>
            <p className="text-muted-foreground">
              Gérez les marchands inscrits sur la plateforme
            </p>
          </div>
          <Button>
            <Store className="w-4 h-4 mr-2" />
            Nouveau marchand
          </Button>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total marchands</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Store className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approuvés</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Actifs ce mois</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.activeThisMonth}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Liste des marchands */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des marchands</CardTitle>
          </CardHeader>
          <CardContent>
            {merchants && merchants.length > 0 ? (
              <div className="space-y-4">
                {merchants.map((merchant) => {
                  const StatusIcon = getStatusIcon(merchant.status);
                  
                  return (
                    <div
                      key={merchant.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Store className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-semibold">{merchant.businessName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {merchant.ownerName}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{merchant.email}</span>
                            </div>
                            
                            {merchant.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{merchant.phone}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{merchant.city}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {merchant.totalOrders} commandes
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {merchant.monthlyRevenue.toFixed(2)}€/mois
                          </div>
                        </div>
                        
                        <Badge
                          className={cn("text-xs", getStatusColor(merchant.status))}
                          variant="secondary"
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {getStatusLabel(merchant.status)}
                        </Badge>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Voir détails
                          </Button>
                          {merchant.status === "pending" && (
                            <>
                              <Button size="sm" variant="default">
                                Approuver
                              </Button>
                              <Button size="sm" variant="destructive">
                                Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Store className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-gray-500 mb-2">Aucun marchand inscrit</p>
                <p className="text-xs text-gray-400">
                  Les nouveaux marchands apparaîtront ici après inscription
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestion des marchands</h1>
            <p className="text-muted-foreground">
              Gérez les marchands inscrits sur la plateforme
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
              <p className="text-red-600 mb-2">
                Erreur lors du chargement des données
              </p>
              <p className="text-xs text-gray-500">
                Impossible de récupérer la liste des marchands
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default MerchantsPage;
