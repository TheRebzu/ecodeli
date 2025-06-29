"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Download, Eye, Clock, CheckCircle, XCircle, AlertCircle, Euro, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

interface MerchantContractManagerProps {
  merchantId: string;
}

interface Contract {
  id: string;
  type: "standard" | "premium" | "enterprise" | "custom";
  status: "draft" | "pending_review" | "active" | "suspended" | "terminated" | "expired";
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  monthlyFee: number;
  commissionRate: number;
  minimumMonthlyVolume?: number;
  maxDeliveries?: number;
  prioritySupport: boolean;
  dedicatedAccount: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  createdAt: string;
  lastModified: string;
  signedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  documentsCount: number;
  nextBillingDate?: string;
}

interface ContractDocument {
  id: string;
  contractId: string;
  name: string;
  type: "contract" | "amendment" | "invoice" | "report";
  fileUrl: string;
  createdAt: string;
  size: number;
}

interface BillingHistory {
  id: string;
  contractId: string;
  period: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "cancelled";
  dueDate: string;
  paidAt?: string;
  invoiceUrl?: string;
}

export default function ContractManager({ merchantId }: MerchantContractManagerProps) {
  const t = useTranslations("merchant.contracts");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractDocuments, setContractDocuments] = useState<ContractDocument[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewContractDialog, setShowNewContractDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");

  const [newContractData, setNewContractData] = useState({
    type: "standard",
    title: "",
    description: "",
    minimumMonthlyVolume: 0,
    maxDeliveries: 100
  });

  useEffect(() => {
    fetchContracts();
  }, [merchantId]);

  const fetchContracts = async () => {
    try {
      const response = await fetch(`/api/merchant/contracts?merchantId=${merchantId}`);
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractDetails = async (contractId: string) => {
    try {
      const [documentsRes, billingRes] = await Promise.all([
        fetch(`/api/merchant/contracts/${contractId}/documents`),
        fetch(`/api/merchant/contracts/${contractId}/billing`)
      ]);

      if (documentsRes.ok) {
        const documentsData = await documentsRes.json();
        setContractDocuments(documentsData.documents || []);
      }

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        setBillingHistory(billingData.billing || []);
      }
    } catch (error) {
      console.error("Error fetching contract details:", error);
    }
  };

  const handleCreateContract = async () => {
    try {
      const response = await fetch("/api/merchant/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          ...newContractData
        })
      });

      if (response.ok) {
        await fetchContracts();
        setShowNewContractDialog(false);
        setNewContractData({
          type: "standard",
          title: "",
          description: "",
          minimumMonthlyVolume: 0,
          maxDeliveries: 100
        });
      }
    } catch (error) {
      console.error("Error creating contract:", error);
    }
  };

  const handleSignContract = async (contractId: string) => {
    try {
      const response = await fetch(`/api/merchant/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId })
      });

      if (response.ok) {
        await fetchContracts();
      }
    } catch (error) {
      console.error("Error signing contract:", error);
    }
  };

  const handleTerminateContract = async (contractId: string) => {
    try {
      const response = await fetch(`/api/merchant/contracts/${contractId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          reason: terminationReason
        })
      });

      if (response.ok) {
        await fetchContracts();
        setShowTerminateDialog(false);
        setTerminationReason("");
        setSelectedContract(null);
      }
    } catch (error) {
      console.error("Error terminating contract:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: t("status.draft"), icon: FileText },
      pending_review: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending_review"), icon: Clock },
      active: { color: "bg-green-100 text-green-800", label: t("status.active"), icon: CheckCircle },
      suspended: { color: "bg-orange-100 text-orange-800", label: t("status.suspended"), icon: AlertCircle },
      terminated: { color: "bg-red-100 text-red-800", label: t("status.terminated"), icon: XCircle },
      expired: { color: "bg-gray-100 text-gray-800", label: t("status.expired"), icon: Clock }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getContractTypeInfo = (type: string) => {
    const typeConfig = {
      standard: {
        name: t("types.standard"),
        monthlyFee: 29.99,
        commissionRate: 15,
        features: [t("features.basic_support"), t("features.standard_analytics")]
      },
      premium: {
        name: t("types.premium"),
        monthlyFee: 99.99,
        commissionRate: 12,
        features: [t("features.priority_support"), t("features.advanced_analytics"), t("features.api_access")]
      },
      enterprise: {
        name: t("types.enterprise"),
        monthlyFee: 299.99,
        commissionRate: 8,
        features: [t("features.dedicated_account"), t("features.custom_branding"), t("features.full_api")]
      },
      custom: {
        name: t("types.custom"),
        monthlyFee: 0,
        commissionRate: 0,
        features: [t("features.negotiated_terms")]
      }
    };

    return typeConfig[type as keyof typeof typeConfig];
  };

  const getBillingStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: "bg-green-100 text-green-800", label: t("billing_status.paid") },
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("billing_status.pending") },
      overdue: { color: "bg-red-100 text-red-800", label: t("billing_status.overdue") },
      cancelled: { color: "bg-gray-100 text-gray-800", label: t("billing_status.cancelled") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("description")}</p>
          </div>
          <Dialog open={showNewContractDialog} onOpenChange={setShowNewContractDialog}>
            <DialogTrigger asChild>
              <Button>
                {t("actions.new_contract")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("new_contract_dialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("new_contract_dialog.description")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contractType">{t("new_contract_dialog.type")}</Label>
                  <Select value={newContractData.type} onValueChange={(value) => setNewContractData({...newContractData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">{t("types.standard")}</SelectItem>
                      <SelectItem value="premium">{t("types.premium")}</SelectItem>
                      <SelectItem value="enterprise">{t("types.enterprise")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contractTitle">{t("new_contract_dialog.title_field")}</Label>
                  <Input
                    id="contractTitle"
                    value={newContractData.title}
                    onChange={(e) => setNewContractData({...newContractData, title: e.target.value})}
                    placeholder={t("new_contract_dialog.title_placeholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="contractDescription">{t("new_contract_dialog.description")}</Label>
                  <Textarea
                    id="contractDescription"
                    value={newContractData.description}
                    onChange={(e) => setNewContractData({...newContractData, description: e.target.value})}
                    placeholder={t("new_contract_dialog.description_placeholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthlyVolume">{t("new_contract_dialog.monthly_volume")}</Label>
                    <Input
                      id="monthlyVolume"
                      type="number"
                      value={newContractData.minimumMonthlyVolume}
                      onChange={(e) => setNewContractData({...newContractData, minimumMonthlyVolume: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDeliveries">{t("new_contract_dialog.max_deliveries")}</Label>
                    <Input
                      id="maxDeliveries"
                      type="number"
                      value={newContractData.maxDeliveries}
                      onChange={(e) => setNewContractData({...newContractData, maxDeliveries: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateContract}>
                  {t("new_contract_dialog.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
          <TabsTrigger value="billing">{t("tabs.billing")}</TabsTrigger>
          <TabsTrigger value="documents">{t("tabs.documents")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {["standard", "premium", "enterprise"].map((type) => {
              const typeInfo = getContractTypeInfo(type);
              const hasActiveContract = contracts.some(c => c.type === type && c.status === "active");
              
              return (
                <Card key={type} className={hasActiveContract ? "border-green-500" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {typeInfo.name}
                      {hasActiveContract && <Badge className="bg-green-100 text-green-800">{t("status.active")}</Badge>}
                    </CardTitle>
                    <CardDescription>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          <span>€{typeInfo.monthlyFee}/mois</span>
                        </div>
                        <div className="text-sm">
                          {t("commission_rate")}: {typeInfo.commissionRate}%
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {typeInfo.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {!hasActiveContract && (
                      <Button 
                        className="w-full"
                        onClick={() => {
                          setNewContractData({...newContractData, type});
                          setShowNewContractDialog(true);
                        }}
                      >
                        {t("actions.select_plan")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {contracts.filter(c => ["active", "pending_review"].includes(c.status)).map((contract) => (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{contract.title}</CardTitle>
                    <CardDescription>{contract.description}</CardDescription>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    <span className="text-sm">€{contract.monthlyFee}/mois</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t("commission")}: {contract.commissionRate}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {contract.nextBillingDate && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      {t("next_billing")}: {new Date(contract.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedContract(contract);
                      fetchContractDetails(contract.id);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t("actions.view_details")}
                  </Button>
                  
                  {contract.status === "pending_review" && (
                    <Button size="sm" onClick={() => handleSignContract(contract.id)}>
                      {t("actions.sign")}
                    </Button>
                  )}
                  
                  {contract.status === "active" && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowTerminateDialog(true);
                      }}
                    >
                      {t("actions.terminate")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {contracts.filter(c => ["active", "pending_review"].includes(c.status)).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_active.title")}</h3>
                <p className="text-gray-600 text-center mb-4">{t("empty_active.description")}</p>
                <Button onClick={() => setShowNewContractDialog(true)}>
                  {t("actions.create_first_contract")}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          {billingHistory.map((billing) => (
            <Card key={billing.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-semibold">{billing.period}</h4>
                  <p className="text-sm text-gray-600">
                    {t("due_date")}: {new Date(billing.dueDate).toLocaleDateString()}
                  </p>
                  {billing.paidAt && (
                    <p className="text-sm text-gray-600">
                      {t("paid_at")}: {new Date(billing.paidAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">€{billing.amount.toFixed(2)}</span>
                    {getBillingStatusBadge(billing.status)}
                  </div>
                  {billing.invoiceUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={billing.invoiceUrl} target="_blank">
                        <Download className="h-3 w-3 mr-1" />
                        {t("actions.download_invoice")}
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {billingHistory.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Euro className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_billing.title")}</h3>
                <p className="text-gray-600 text-center">{t("empty_billing.description")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {contractDocuments.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <h4 className="font-semibold">{doc.name}</h4>
                    <p className="text-sm text-gray-600">
                      {doc.type} • {(doc.size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank">
                      <Eye className="h-3 w-3 mr-1" />
                      {t("actions.view")}
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.fileUrl} download>
                      <Download className="h-3 w-3 mr-1" />
                      {t("actions.download")}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {contractDocuments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_documents.title")}</h3>
                <p className="text-gray-600 text-center">{t("empty_documents.description")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {showTerminateDialog && selectedContract && (
        <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("terminate_dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("terminate_dialog.description", { title: selectedContract.title })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="terminationReason">{t("terminate_dialog.reason")}</Label>
                <Textarea
                  id="terminationReason"
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder={t("terminate_dialog.reason_placeholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="destructive"
                onClick={() => handleTerminateContract(selectedContract.id)}
                disabled={!terminationReason.trim()}
              >
                {t("terminate_dialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}