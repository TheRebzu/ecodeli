"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Euro,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import WithdrawalRequestDialog from "./withdrawal-request-dialog";

interface WalletManagerProps {
  delivererId: string;
}

interface WalletData {
  balance: number;
  totalEarnings: number;
  monthlyEarnings: number;
  pendingEarnings: number;
  availableForWithdrawal: number;
  lastWithdrawal?: {
    amount: number;
    date: string;
    status: string;
  };
}

interface WalletOperation {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  date: string;
  reference?: string;
  deliveryId?: string;
}

interface Earning {
  id: string;
  deliveryId: string;
  announcementTitle: string;
  clientName: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: string;
  date: string;
  paidAt?: string;
}

export default function WalletManager({ delivererId }: WalletManagerProps) {
  const t = useTranslations("deliverer.wallet");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [operations, setOperations] = useState<WalletOperation[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/deliverer/wallet");
      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchOperations = async () => {
    try {
      const response = await fetch("/api/deliverer/wallet/operations");
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || []);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await fetch("/api/deliverer/wallet/earnings");
      if (response.ok) {
        const data = await response.json();
        setEarnings(data.earnings || []);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    }
  };

  useEffect(() => {
    fetchWalletData();
    fetchOperations();
    fetchEarnings();
  }, [delivererId]);

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "earning":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "withdrawal":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "refund":
        return <ArrowUpRight className="w-4 h-4 text-yellow-600" />;
      default:
        return <Euro className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: "bg-green-100 text-green-800", label: t("status.completed") },
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      processing: { color: "bg-blue-100 text-blue-800", label: t("status.processing") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") },
      failed: { color: "bg-red-100 text-red-800", label: t("status.failed") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading || !walletData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Wallet Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.current_balance")}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {walletData.balance.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.available_balance")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.total_earnings")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {walletData.totalEarnings.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.all_time")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.monthly_earnings")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {walletData.monthlyEarnings.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.this_month")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.pending_earnings")}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {walletData.pendingEarnings.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.processing")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("withdrawal.title")}</span>
              <Button
                onClick={() => setShowWithdrawalDialog(true)}
                disabled={walletData.availableForWithdrawal < 10}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {t("withdrawal.request")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t("withdrawal.available")}</span>
                <span className="text-lg font-semibold text-green-600">
                  {walletData.availableForWithdrawal.toFixed(2)}€
                </span>
              </div>
              
              {walletData.lastWithdrawal && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">{t("withdrawal.last")}</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span>{walletData.lastWithdrawal.amount.toFixed(2)}€</span>
                    <span>{new Date(walletData.lastWithdrawal.date).toLocaleDateString()}</span>
                    {getStatusBadge(walletData.lastWithdrawal.status)}
                  </div>
                </div>
              )}
              
              {walletData.availableForWithdrawal < 10 && (
                <p className="text-sm text-yellow-600">
                  {t("withdrawal.minimum_amount")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Operations and Earnings */}
        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="operations">
              {t("tabs.operations")} ({operations.length})
            </TabsTrigger>
            <TabsTrigger value="earnings">
              {t("tabs.earnings")} ({earnings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4">
            {operations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("empty.no_operations")}
                  </h3>
                  <p className="text-gray-600">{t("empty.operations_description")}</p>
                </CardContent>
              </Card>
            ) : (
              operations.map((operation) => (
                <Card key={operation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getOperationIcon(operation.type)}
                        <div>
                          <p className="font-medium">{operation.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(operation.date).toLocaleString()}
                          </p>
                          {operation.reference && (
                            <p className="text-xs text-gray-400">
                              {t("operation.reference")}: {operation.reference}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          operation.type === "earning" ? "text-green-600" : "text-red-600"
                        }`}>
                          {operation.type === "earning" ? "+" : "-"}{operation.amount.toFixed(2)}€
                        </p>
                        {getStatusBadge(operation.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4">
            {earnings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("empty.no_earnings")}
                  </h3>
                  <p className="text-gray-600">{t("empty.earnings_description")}</p>
                </CardContent>
              </Card>
            ) : (
              earnings.map((earning) => (
                <Card key={earning.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{earning.announcementTitle}</h4>
                        <p className="text-sm text-gray-600">{earning.clientName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(earning.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          <span className="text-gray-500">{t("earning.gross")}:</span>
                          <span className="ml-1">{earning.amount.toFixed(2)}€</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">{t("earning.commission")}:</span>
                          <span className="ml-1 text-red-600">-{earning.commission.toFixed(2)}€</span>
                        </div>
                        <div className="text-lg font-semibold text-green-600">
                          {earning.netAmount.toFixed(2)}€
                        </div>
                        {getStatusBadge(earning.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <WithdrawalRequestDialog
        open={showWithdrawalDialog}
        onOpenChange={setShowWithdrawalDialog}
        availableAmount={walletData.availableForWithdrawal}
        onSuccess={() => {
          fetchWalletData();
          fetchOperations();
          setShowWithdrawalDialog(false);
        }}
      />
    </>
  );
} 