'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, LineChart, Package, Users } from "lucide-react";
import { UsersDistribution } from "./users-distribution";

type RoleCount = {
  role: string;
  _count: {
    id: number;
  }
};

type TabsContentProps = {
  usersByRole: RoleCount[];
};

export function ReportTabs({ usersByRole }: TabsContentProps) {
  return (
    <Tabs defaultValue="deliveries" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="deliveries">
          <Package className="h-4 w-4 mr-2" />
          Livraisons
        </TabsTrigger>
        <TabsTrigger value="users">
          <Users className="h-4 w-4 mr-2" />
          Utilisateurs
        </TabsTrigger>
        <TabsTrigger value="revenue">
          <BarChart2 className="h-4 w-4 mr-2" />
          Revenus
        </TabsTrigger>
      </TabsList>
      <TabsContent value="deliveries">
        <Card>
          <CardHeader>
            <CardTitle>Statistiques de livraison</CardTitle>
            <CardDescription>
              Distribution des livraisons par statut au cours du temps
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <div className="h-full flex items-center justify-center">
              <LineChart className="h-16 w-16 text-slate-300" />
              <p className="text-slate-500 ml-4">
                Graphique de l&apos;évolution des livraisons
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle>Distribution des utilisateurs</CardTitle>
            <CardDescription>Répartition par type d&apos;utilisateur</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <div className="h-full flex items-center justify-center">
              <div className="space-y-4 w-full max-w-md">
                <UsersDistribution usersByRole={usersByRole} />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="revenue">
        <Card>
          <CardHeader>
            <CardTitle>Analyse des revenus</CardTitle>
            <CardDescription>
              Distribution des revenus par source
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <div className="h-full flex items-center justify-center">
              <BarChart2 className="h-16 w-16 text-slate-300" />
              <p className="text-slate-500 ml-4">
                Graphique de répartition des revenus
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
} 