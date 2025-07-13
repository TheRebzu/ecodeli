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
  FileText,
  Package,
  Euro,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";

export function MerchantDashboard() {
  const contractInfo = {
    id: "CTR-2024-001",
    status: "ACTIVE",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    commissionRate: 12,
    monthlyFee: 99,
  };

  const announcements = [
    {
      id: "1",
      title: "Livraison courses express",
      client: "Marie D.",
      status: "ACTIVE",
      price: 25,
      createdAt: "2024-06-28",
    },
    {
      id: "2",
      title: "Transport produits frais",
      client: "Jean M.",
      status: "COMPLETED",
      price: 45,
      createdAt: "2024-06-27",
    },
    {
      id: "3",
      title: "Livraison groupée",
      client: "Sophie L.",
      status: "PENDING",
      price: 35,
      createdAt: "2024-06-29",
    },
  ];

  const invoices = [
    {
      id: "INV-2024-06",
      period: "Juin 2024",
      amount: 1250,
      status: "PAID",
      dueDate: "2024-07-15",
    },
    {
      id: "INV-2024-05",
      period: "Mai 2024",
      amount: 1180,
      status: "PAID",
      dueDate: "2024-06-15",
    },
    {
      id: "INV-2024-04",
      period: "Avril 2024",
      amount: 980,
      status: "PAID",
      dueDate: "2024-05-15",
    },
  ];

  const payments = [
    {
      id: "1",
      date: "2024-06-25",
      amount: 25,
      type: "Commission",
      description: "Livraison #1234",
    },
    {
      id: "2",
      date: "2024-06-24",
      amount: 45,
      type: "Commission",
      description: "Livraison #1233",
    },
    {
      id: "3",
      date: "2024-06-23",
      amount: 35,
      type: "Commission",
      description: "Livraison #1232",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Espace Commerçant</h1>
        <p className="text-muted-foreground">
          Gérez votre contrat, annonces et facturation
        </p>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Livraisons ce mois
                </p>
                <p className="text-2xl font-bold">45</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Chiffre d'affaires
                </p>
                <p className="text-2xl font-bold">3,250€</p>
              </div>
              <Euro className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Clients actifs
                </p>
                <p className="text-2xl font-bold">127</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Croissance
                </p>
                <p className="text-2xl font-bold">+15%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contrat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gestion du contrat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Informations contractuelles</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Numéro de contrat:</span>
                  <span className="font-medium">{contractInfo.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Statut:</span>
                  <Badge className="bg-green-100 text-green-800">
                    {contractInfo.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Période:</span>
                  <span>
                    {contractInfo.startDate} - {contractInfo.endDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taux de commission:</span>
                  <span>{contractInfo.commissionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Abonnement mensuel:</span>
                  <span>{contractInfo.monthlyFee}€</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  Télécharger le contrat
                </Button>
                <Button variant="outline" className="w-full">
                  Demander modification
                </Button>
                <Button variant="outline" className="w-full">
                  Historique des avenants
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annonces */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des annonces</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Annonce</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>{announcement.title}</TableCell>
                  <TableCell>{announcement.client}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        announcement.status === "COMPLETED"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {announcement.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{announcement.price}€</TableCell>
                  <TableCell>
                    {new Date(announcement.createdAt).toLocaleDateString(
                      "fr-FR",
                    )}
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
          <div className="mt-4">
            <Button>Créer une annonce</Button>
          </div>
        </CardContent>
      </Card>

      {/* Facturation */}
      <Card>
        <CardHeader>
          <CardTitle>Facturation des services</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.period}</TableCell>
                  <TableCell>{invoice.amount}€</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Télécharger
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paiements */}
      <Card>
        <CardHeader>
          <CardTitle>Accès aux paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.date).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>{payment.type}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell className="text-green-600">
                    +{payment.amount}€
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
