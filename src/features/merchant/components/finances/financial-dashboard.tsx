"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  FileText,
  Calendar,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface FinancialData {
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    averageOrderValue: number;
    totalOrders: number;
  };
  payments: {
    totalPayments: number;
    pendingPayments: number;
    completedPayments: number;
    failedPayments: number;
    paymentHistory: Array<{
      id: string;
      amount: number;
      status: "PENDING" | "COMPLETED" | "FAILED";
      type: "DELIVERY" | "COMMISSION" | "REFUND";
      date: string;
      description: string;
    }>;
  };
  commissions: {
    totalCommissions: number;
    monthlyCommissions: number;
    commissionRate: number;
    pendingCommissions: number;
    commissionHistory: Array<{
      id: string;
      amount: number;
      orderId: string;
      date: string;
      status: "PENDING" | "PAID";
    }>;
  };
  expenses: {
    totalExpenses: number;
    monthlyExpenses: number;
    expenseCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
}

export function FinancialDashboard() {
  const t = useTranslations("merchant.finances");
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/merchant/finances?timeRange=${timeRange}`,
      );
      if (response.ok) {
        const financialData = await response.json();
        setData(financialData);
      } else {
        toast.error("Failed to fetch financial data");
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Error loading financial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [timeRange]);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportFinancialData = () => {
    if (!data) return;

    const csvContent = [
      ["Date", "Type", "Amount", "Status", "Description"],
      ...data.payments.paymentHistory.map((payment) => [
        new Date(payment.date).toLocaleDateString(),
        payment.type,
        payment.amount.toFixed(2),
        payment.status,
        payment.description,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financial_data.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Financial data exported successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading financial data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No financial data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.revenue.totalRevenue.toFixed(2)}€
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {data.revenue.revenueGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              {Math.abs(data.revenue.revenueGrowth)}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.revenue.monthlyRevenue.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {data.revenue.totalOrders} orders this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.commissions.totalCommissions.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {data.commissions.pendingCommissions.toFixed(2)}€ pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                data.revenue.totalRevenue - data.expenses.totalExpenses
              ).toFixed(2)}
              €
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                ((data.revenue.totalRevenue - data.expenses.totalExpenses) /
                  data.revenue.totalRevenue) *
                100
              ).toFixed(1)}
              % margin
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Delivery Payments</span>
                    <span className="font-semibold">
                      {(data.revenue.totalRevenue * 0.7).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Commission Payments</span>
                    <span className="font-semibold">
                      {(data.revenue.totalRevenue * 0.2).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Other Revenue</span>
                    <span className="font-semibold">
                      {(data.revenue.totalRevenue * 0.1).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Current payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Completed</span>
                    <Badge className="bg-green-100 text-green-800">
                      {data.payments.completedPayments}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pending</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {data.payments.pendingPayments}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Failed</span>
                    <Badge className="bg-red-100 text-red-800">
                      {data.payments.failedPayments}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <Button variant="outline" onClick={exportFinancialData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {payment.amount.toFixed(2)}€
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getPaymentStatusIcon(payment.status)}
                          <Badge
                            className={`ml-2 ${getPaymentStatusColor(payment.status)}`}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {payment.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Commission Overview</CardTitle>
                <CardDescription>Commission statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Commissions</span>
                  <span className="font-semibold">
                    {data.commissions.totalCommissions.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Commissions</span>
                  <span className="font-semibold">
                    {data.commissions.monthlyCommissions.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Commission Rate</span>
                  <span className="font-semibold">
                    {data.commissions.commissionRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending</span>
                  <span className="font-semibold text-yellow-600">
                    {data.commissions.pendingCommissions.toFixed(2)}€
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>Recent commission payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.commissions.commissionHistory
                    .slice(0, 5)
                    .map((commission) => (
                      <div
                        key={commission.id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">
                            Order #{commission.orderId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(commission.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {commission.amount.toFixed(2)}€
                          </div>
                          <Badge
                            className={
                              commission.status === "PAID"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {commission.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commission Trends</CardTitle>
                <CardDescription>Monthly commission growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +
                    {(
                      (data.commissions.monthlyCommissions /
                        data.commissions.totalCommissions) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">
                    This month vs average
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Overview</CardTitle>
                <CardDescription>Total and monthly expenses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Expenses</span>
                  <span className="font-semibold">
                    {data.expenses.totalExpenses.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Expenses</span>
                  <span className="font-semibold">
                    {data.expenses.monthlyExpenses.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Expense Ratio</span>
                  <span className="font-semibold">
                    {(
                      (data.expenses.totalExpenses /
                        data.revenue.totalRevenue) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.expenses.expenseCategories.map((category, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm">{category.category}</span>
                      <div className="text-right">
                        <div className="font-medium">
                          {category.amount.toFixed(2)}€
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {category.percentage.toFixed(1)}%
                        </div>
                      </div>
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
