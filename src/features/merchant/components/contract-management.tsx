"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import {
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Calendar,
  Euro,
  MapPin,
  Clock,
  Edit,
  Eye,
  ExternalLink
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ContractManagementProps {
  merchantId: string;
}

interface Contract {
  id: string;
  type: string;
  status: string;
  version: string;
  title: string;
  description?: string;
  commissionRate: number;
  minCommissionAmount?: number;
  setupFee: number;
  monthlyFee: number;
  validFrom: string;
  validUntil?: string;
  autoRenewal: boolean;
  renewalPeriod: number;
  maxOrdersPerMonth?: number;
  maxOrderValue?: number;
  deliveryZones: any[];
  allowedServices: string[];
  merchantSignedAt?: string;
  adminSignedAt?: string;
  signedDocumentPath?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  amendments: ContractAmendment[];
  billingCycles: BillingCycle[];
}

interface ContractAmendment {
  id: string;
  version: string;
  title: string;
  description: string;
  changes: any;
  effectiveDate: string;
  merchantSignedAt?: string;
  adminSignedAt?: string;
  createdAt: string;
}

interface BillingCycle {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalOrders: number;
  totalRevenue: number;
  commissionAmount: number;
  monthlyFee: number;
  additionalFees: number;
  totalAmount: number;
  invoiceNumber?: string;
  dueDate?: string;
  paidAt?: string;
}

export default function ContractManagement({ merchantId }: ContractManagementProps) {
  const t = useTranslations("merchant.contract");
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    fetchContract();
  }, [merchantId]);

  const fetchContract = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/merchant/contracts');
      if (response.ok) {
        const data = await response.json();
        setContract(data.contract);
      }
    } catch (error) {
      console.error("Error fetching contract:", error);
      toast({
        title: t("error.fetch_failed"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    setSigning(true);
    try {
      const response = await fetch('/api/merchant/contracts', {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'sign' })
      });

      if (response.ok) {
        toast({
          title: t("success.contract_signed"),
          description: t("success.contract_signed_desc")
        });
        setShowSignDialog(false);
        fetchContract();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to sign contract");
      }
    } catch (error) {
      toast({
        title: t("error.sign_failed"),
        description: error instanceof Error ? error.message : t("error.generic"),
        variant: "destructive"
      });
    } finally {
      setSigning(false);
    }
  };

  const downloadContract = async (contractId: string) => {
    try {
      const response = await fetch(`/api/merchant/contracts/${contractId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `contract_${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: t("error.download_failed"),
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: "bg-gray-100 text-gray-800", label: t("status.draft") },
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      ACTIVE: { color: "bg-green-100 text-green-800", label: t("status.active") },
      SUSPENDED: { color: "bg-red-100 text-red-800", label: t("status.suspended") },
      TERMINATED: { color: "bg-gray-100 text-gray-800", label: t("status.terminated") }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      STANDARD: { color: "bg-blue-100 text-blue-800", label: t("type.standard") },
      PREMIUM: { color: "bg-purple-100 text-purple-800", label: t("type.premium") },
      ENTERPRISE: { color: "bg-orange-100 text-orange-800", label: t("type.enterprise") },
      CUSTOM: { color: "bg-green-100 text-green-800", label: t("type.custom") }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.STANDARD;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
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

  if (!contract) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("no_contract.title")}
          </h3>
          <p className="text-gray-600 mb-4">
            {t("no_contract.description")}
          </p>
          <Button>
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("actions.contact_admin")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {contract.title}
              </CardTitle>
              <CardDescription>
                {t("contract_details")} - {t("version")} {contract.version}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(contract.status)}
              {getTypeBadge(contract.type)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {contract.description && (
            <p className="text-gray-600">{contract.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t("commission_rate")}</p>
                <p className="font-medium">{contract.commissionRate}%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t("valid_from")}</p>
                <p className="font-medium">{formatDate(contract.validFrom)}</p>
              </div>
            </div>
            
            {contract.validUntil && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">{t("valid_until")}</p>
                  <p className="font-medium">{formatDate(contract.validUntil)}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t("renewal_period")}</p>
                <p className="font-medium">{contract.renewalPeriod} {t("months")}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {!contract.merchantSignedAt && contract.status === 'PENDING' && (
              <Button onClick={() => setShowSignDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("actions.sign_contract")}
              </Button>
            )}
            
            {contract.signedDocumentPath && (
              <Button
                variant="outline"
                onClick={() => downloadContract(contract.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("actions.download")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">{t("tabs.details")}</TabsTrigger>
          <TabsTrigger value="conditions">{t("tabs.conditions")}</TabsTrigger>
          <TabsTrigger value="amendments">{t("tabs.amendments")}</TabsTrigger>
          <TabsTrigger value="billing">{t("tabs.billing")}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("contract_information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{t("financial_conditions")}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("commission_rate")}:</span>
                        <span className="font-medium">{contract.commissionRate}%</span>
                      </div>
                      {contract.minCommissionAmount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t("min_commission")}:</span>
                          <span className="font-medium">{formatCurrency(contract.minCommissionAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("setup_fee")}:</span>
                        <span className="font-medium">{formatCurrency(contract.setupFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("monthly_fee")}:</span>
                        <span className="font-medium">{formatCurrency(contract.monthlyFee)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{t("limits_conditions")}</h4>
                    <div className="space-y-2 text-sm">
                      {contract.maxOrdersPerMonth && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t("max_orders_month")}:</span>
                          <span className="font-medium">{contract.maxOrdersPerMonth}</span>
                        </div>
                      )}
                      {contract.maxOrderValue && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t("max_order_value")}:</span>
                          <span className="font-medium">{formatCurrency(contract.maxOrderValue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("auto_renewal")}:</span>
                        <span className="font-medium">{contract.autoRenewal ? t("yes") : t("no")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <Separator />
              <div>
                <h4 className="font-medium mb-2">{t("signatures")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className={`h-4 w-4 ${contract.merchantSignedAt ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{t("merchant_signature")}</span>
                    </div>
                    {contract.merchantSignedAt ? (
                      <p className="text-sm text-gray-600">
                        {t("signed_on")} {formatDate(contract.merchantSignedAt)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">{t("not_signed")}</p>
                    )}
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className={`h-4 w-4 ${contract.adminSignedAt ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{t("admin_signature")}</span>
                    </div>
                    {contract.adminSignedAt ? (
                      <p className="text-sm text-gray-600">
                        {t("signed_on")} {formatDate(contract.adminSignedAt)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">{t("pending_admin_signature")}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("delivery_zones_services")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{t("allowed_services")}</h4>
                <div className="flex flex-wrap gap-2">
                  {contract.allowedServices.map((service, index) => (
                    <Badge key={index} variant="outline">
                      {t(`services.${service.toLowerCase()}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">{t("delivery_zones")}</h4>
                <div className="space-y-2">
                  {contract.deliveryZones.map((zone: any, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{zone.name || zone}</span>
                    </div>
                  ))}
                </div>
              </div>

              {contract.notes && (
                <div>
                  <h4 className="font-medium mb-2">{t("notes")}</h4>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                    {contract.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amendments" className="space-y-4">
          {contract.amendments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("amendments.empty_title")}
                </h3>
                <p className="text-gray-600">
                  {t("amendments.empty_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {contract.amendments.map((amendment) => (
                <Card key={amendment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {amendment.title} - v{amendment.version}
                        </CardTitle>
                        <CardDescription>
                          {t("effective_date")}: {formatDate(amendment.effectiveDate)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {amendment.merchantSignedAt && (
                          <Badge className="bg-green-100 text-green-800">
                            {t("merchant_signed")}
                          </Badge>
                        )}
                        {amendment.adminSignedAt && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {t("admin_signed")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{amendment.description}</p>
                    <div className="text-xs text-gray-500">
                      {t("created_on")}: {formatDate(amendment.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          {contract.billingCycles.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Euro className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("billing.empty_title")}
                </h3>
                <p className="text-gray-600">
                  {t("billing.empty_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {contract.billingCycles.map((billing) => (
                <Card key={billing.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {formatDate(billing.periodStart)} - {formatDate(billing.periodEnd)}
                        </CardTitle>
                        {billing.invoiceNumber && (
                          <CardDescription>
                            {t("invoice_number")}: {billing.invoiceNumber}
                          </CardDescription>
                        )}
                      </div>
                      <Badge className={
                        billing.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        billing.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {t(`billing.status.${billing.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">{t("total_orders")}</p>
                        <p className="font-medium">{billing.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t("total_revenue")}</p>
                        <p className="font-medium">{formatCurrency(billing.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t("commission_amount")}</p>
                        <p className="font-medium">{formatCurrency(billing.commissionAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t("total_amount")}</p>
                        <p className="font-semibold text-lg">{formatCurrency(billing.totalAmount)}</p>
                      </div>
                    </div>
                    
                    {billing.dueDate && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {t("due_date")}: {formatDate(billing.dueDate)}
                          </span>
                          {billing.paidAt && (
                            <span className="text-green-600">
                              {t("paid_on")}: {formatDate(billing.paidAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de signature */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sign_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("sign_dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-yellow-50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">
                    {t("sign_dialog.warning_title")}
                  </p>
                  <p className="text-sm text-yellow-700">
                    {t("sign_dialog.warning_description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignDialog(false)}
              disabled={signing}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={handleSignContract}
              disabled={signing}
            >
              {signing ? t("actions.signing") : t("actions.sign_electronically")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}