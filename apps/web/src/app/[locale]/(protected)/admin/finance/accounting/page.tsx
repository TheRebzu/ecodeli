'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  FileText,
  Euro,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface FinancialData {
  revenue: number;
  expenses: number;
  profit: number;
  commissions: number;
  taxes: number;
  period: string;
}

interface Transaction {
  id: string;
  date: Date;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  reference?: string;
}

export default function AccountingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState('2024');

  // Récupérer les données financières via tRPC
  const { data: financialData, isLoading } = api.admin.financial.getStats.useQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Début du mois
    endDate: new Date(), // Aujourd'hui
  });

  // Récupérer les transactions via tRPC
  const { data: transactionsData } = api.admin.financial.getTransactions.useQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    limit: 50,
  });

  const financialSummary: FinancialData = financialData || {
    revenue: 0,
    expenses: 0,
    profit: 0,
    commissions: 0,
    taxes: 0,
    period: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  };

  const transactions: Transaction[] = transactionsData?.transactions || [
    {
      id: '1',
      date: new Date('2024-01-14'),
      type: 'INCOME',
      category: 'Commissions',
      description: 'Commission sur livraisons',
      amount: 1250.0,
      status: 'COMPLETED',
      reference: 'COM-2024-001',
    },
    {
      id: '2',
      date: new Date('2024-01-13'),
      type: 'EXPENSE',
      category: 'Infrastructure',
      description: 'Serveurs AWS',
      amount: 890.5,
      status: 'COMPLETED',
      reference: 'AWS-2024-001',
    },
    {
      id: '3',
      date: new Date('2024-01-12'),
      type: 'INCOME',
      category: 'Abonnements',
      description: 'Abonnements premium',
      amount: 2340.0,
      status: 'COMPLETED',
      reference: 'SUB-2024-001',
    },
    {
      id: '4',
      date: new Date('2024-01-11'),
      type: 'EXPENSE',
      category: 'Marketing',
      description: 'Campagne publicitaire',
      amount: 1500.0,
      status: 'PENDING',
      reference: 'MKT-2024-001',
    },
    {
      id: '5',
      date: new Date('2024-01-10'),
      type: 'EXPENSE',
      category: 'Salaires',
      description: 'Salaires équipe',
      amount: 15000.0,
      status: 'COMPLETED',
      reference: 'SAL-2024-001',
    },
  ];

  const monthlyData = [
    { month: 'Jan', revenue: 125430, expenses: 78920, profit: 46510 },
    { month: 'Fév', revenue: 134200, expenses: 82100, profit: 52100 },
    { month: 'Mar', revenue: 142800, expenses: 85600, profit: 57200 },
    { month: 'Avr', revenue: 138900, expenses: 83400, profit: 55500 },
    { month: 'Mai', revenue: 156700, expenses: 89200, profit: 67500 },
    { month: 'Jun', revenue: 148300, expenses: 87100, profit: 61200 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getTransactionTypeIcon = (type: 'INCOME' | 'EXPENSE') => {
    return type === 'INCOME' ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Terminé
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            En attente
          </Badge>
        );
      case 'CANCELLED':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const profitMargin = ((financialSummary.profit / financialSummary.revenue) * 100).toFixed(1);
  const expenseRatio = ((financialSummary.expenses / financialSummary.revenue) * 100).toFixed(1);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Chargement des données financières...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comptabilité</h1>
          <p className="text-muted-foreground">Tableau de bord financier et comptable</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialSummary.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">+12.5% par rapport au mois dernier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(financialSummary.expenses)}
            </div>
            <p className="text-xs text-muted-foreground">{expenseRatio}% du CA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice net</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(financialSummary.profit)}
            </div>
            <p className="text-xs text-muted-foreground">Marge: {profitMargin}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.commissions)}</div>
            <p className="text-xs text-muted-foreground">5% du CA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxes</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.taxes)}</div>
            <p className="text-xs text-muted-foreground">TVA et charges</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Graphique des revenus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Évolution mensuelle
                </CardTitle>
                <CardDescription>Revenus, dépenses et bénéfices sur 6 mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyData.map((data, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{data.month}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">+{formatCurrency(data.revenue)}</span>
                        <span className="text-red-600">-{formatCurrency(data.expenses)}</span>
                        <span className="font-medium">{formatCurrency(data.profit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Répartition des dépenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition des dépenses
                </CardTitle>
                <CardDescription>Catégories de dépenses principales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Salaires</span>
                    </div>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Infrastructure</span>
                    </div>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Marketing</span>
                    </div>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Autres</span>
                    </div>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transactions récentes</CardTitle>
              <CardDescription>Historique des transactions financières</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date.toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionTypeIcon(transaction.type)}
                          <span
                            className={
                              transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {transaction.type === 'INCOME' ? 'Recette' : 'Dépense'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell
                        className={
                          transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {transaction.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Rapports disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Receipt className="mr-2 h-4 w-4" />
                  Bilan comptable
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calculator className="mr-2 h-4 w-4" />
                  Compte de résultat
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Euro className="mr-2 h-4 w-4" />
                  Déclaration TVA
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Analyse de rentabilité
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter les données
                </Button>
                <Button variant="outline" className="w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  Planifier un rapport
                </Button>
                <Button variant="outline" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Générer facture
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyses financières</CardTitle>
              <CardDescription>Indicateurs de performance et tendances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Croissance mensuelle</Label>
                  <div className="text-2xl font-bold text-green-600">+12.5%</div>
                  <p className="text-xs text-muted-foreground">Par rapport au mois dernier</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Marge bénéficiaire</Label>
                  <div className="text-2xl font-bold text-blue-600">{profitMargin}%</div>
                  <p className="text-xs text-muted-foreground">Objectif: 40%</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ratio dépenses/CA</Label>
                  <div className="text-2xl font-bold text-orange-600">{expenseRatio}%</div>
                  <p className="text-xs text-muted-foreground">Optimisation possible</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
