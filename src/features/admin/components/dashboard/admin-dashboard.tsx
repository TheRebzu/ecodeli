"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Package,
  Euro,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

export function AdminDashboard() {
  const stats = {
    totalUsers: 1247,
    activeDeliveries: 89,
    monthlyRevenue: 45680,
    pendingValidations: 12,
  };

  const users = [
    {
      id: "1",
      name: "Marie Dubois",
      email: "marie@test.com",
      role: "CLIENT",
      status: "ACTIVE",
      joinedAt: "2024-06-15",
    },
    {
      id: "2",
      name: "Thomas Moreau",
      email: "thomas@test.com",
      role: "DELIVERER",
      status: "PENDING",
      joinedAt: "2024-06-20",
    },
    {
      id: "3",
      name: "Carrefour City",
      email: "contact@carrefour.com",
      role: "MERCHANT",
      status: "ACTIVE",
      joinedAt: "2024-05-10",
    },
  ];

  const deliveries = [
    {
      id: "1",
      client: "Marie D.",
      deliverer: "Thomas M.",
      status: "EN_COURS",
      amount: 25,
      createdAt: "2024-06-29",
    },
    {
      id: "2",
      client: "Jean M.",
      deliverer: "Lucas S.",
      status: "TERMINE",
      amount: 45,
      createdAt: "2024-06-28",
    },
    {
      id: "3",
      client: "Sophie L.",
      deliverer: null,
      status: "ATTENTE",
      amount: 35,
      createdAt: "2024-06-29",
    },
  ];

  const contracts = [
    {
      id: "CTR-001",
      merchant: "Carrefour City",
      status: "ACTIVE",
      startDate: "2024-01-01",
      monthlyFee: 99,
    },
    {
      id: "CTR-002",
      merchant: "Monoprix",
      status: "ACTIVE",
      startDate: "2024-02-15",
      monthlyFee: 149,
    },
    {
      id: "CTR-003",
      merchant: "Franprix",
      status: "PENDING",
      startDate: "2024-07-01",
      monthlyFee: 99,
    },
  ];

  const finances = [
    { type: "Commissions livraisons", amount: 15680, trend: "+12%" },
    { type: "Abonnements commerçants", amount: 8950, trend: "+5%" },
    { type: "Frais prestataires", amount: -12340, trend: "+8%" },
    { type: "Revenus nets", amount: 12290, trend: "+15%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration EcoDeli</h1>
        <p className="text-muted-foreground">
          Gestion de l'activité professionnelle et des revenus
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Utilisateurs totaux
                </p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Livraisons actives
                </p>
                <p className="text-2xl font-bold">{stats.activeDeliveries}</p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Revenus mensuels
                </p>
                <p className="text-2xl font-bold">
                  {stats.monthlyRevenue.toLocaleString()}€
                </p>
              </div>
              <Euro className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Validations en attente
                </p>
                <p className="text-2xl font-bold">{stats.pendingValidations}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.joinedAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Gérer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des livraisons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Livreur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>{delivery.client}</TableCell>
                  <TableCell>{delivery.deliverer || "Non assigné"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        delivery.status === "TERMINE" ? "default" : "secondary"
                      }
                    >
                      {delivery.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{delivery.amount}€</TableCell>
                  <TableCell>
                    {new Date(delivery.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des contrats commerçants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrat</TableHead>
                <TableHead>Commerçant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date début</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.id}</TableCell>
                  <TableCell>{contract.merchant}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        contract.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(contract.startDate).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>{contract.monthlyFee}€/mois</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Gérer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestion financière</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {finances.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{item.type}</h4>
                    <p
                      className={`text-2xl font-bold ${item.amount < 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {item.amount < 0 ? "" : "+"}
                      {item.amount.toLocaleString()}€
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-green-600">{item.trend}</span>
                    <TrendingUp className="w-4 h-4 text-green-600 inline ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button>Générer rapport mensuel</Button>
            <Button variant="outline">Exporter données</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
