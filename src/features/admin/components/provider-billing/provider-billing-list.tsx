"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  Download,
  Eye,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface ProviderInvoice {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  month: string;
  year: string;
  status: "PENDING" | "GENERATED" | "PAID" | "OVERDUE";
  totalAmount: number;
  servicesCount: number;
  generatedAt?: string;
  paidAt?: string;
  dueDate: string;
}

interface BillingListProps {
  statusFilter: string;
  searchTerm: string;
  monthFilter: string;
}

export function ProviderBillingList({
  statusFilter,
  searchTerm,
  monthFilter,
}: BillingListProps) {
  const t = useTranslations("admin.providerBilling");
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          status: statusFilter !== "all" ? statusFilter : "",
          search: searchTerm,
          month: monthFilter,
        });

        const response = await fetch(`/api/admin/provider-billing?${params}`);
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
          setPagination(
            data.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
          );
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
        // Mock data for development
        setInvoices([
          {
            id: "INV-001",
            providerId: "PROV-001",
            providerName: "Marie Dubois",
            providerEmail: "marie@example.com",
            month: "06",
            year: "2024",
            status: "PENDING",
            totalAmount: 1250,
            servicesCount: 8,
            dueDate: "2024-07-30",
          },
          {
            id: "INV-002",
            providerId: "PROV-002",
            providerName: "Thomas Moreau",
            providerEmail: "thomas@example.com",
            month: "06",
            year: "2024",
            status: "GENERATED",
            totalAmount: 890,
            servicesCount: 5,
            generatedAt: "2024-07-01",
            dueDate: "2024-07-30",
          },
          {
            id: "INV-003",
            providerId: "PROV-003",
            providerName: "Sophie Laurent",
            providerEmail: "sophie@example.com",
            month: "06",
            year: "2024",
            status: "PAID",
            totalAmount: 2100,
            servicesCount: 12,
            generatedAt: "2024-07-01",
            paidAt: "2024-07-15",
            dueDate: "2024-07-30",
          },
          {
            id: "INV-004",
            providerId: "PROV-004",
            providerName: "Jean Martin",
            providerEmail: "jean@example.com",
            month: "05",
            year: "2024",
            status: "OVERDUE",
            totalAmount: 750,
            servicesCount: 4,
            generatedAt: "2024-06-01",
            dueDate: "2024-06-30",
          },
        ]);
        setPagination({ page: 1, limit: 10, total: 4, pages: 1 });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [statusFilter, searchTerm, monthFilter, pagination.page]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "GENERATED":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.generated")}
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("status.paid")}
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t("status.overdue")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleGenerateInvoice = async (providerId: string) => {
    try {
      const response = await fetch(`/api/admin/provider-billing/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerId }),
      });

      if (response.ok) {
        // Refresh the list
        window.location.reload();
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `/api/admin/provider-billing/${invoiceId}/download`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("invoices.title")}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t("invoices.export")}
            </Button>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              {t("invoices.generateAll")}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoices.provider")}</TableHead>
              <TableHead>{t("invoices.period")}</TableHead>
              <TableHead>{t("invoices.amount")}</TableHead>
              <TableHead>{t("invoices.services")}</TableHead>
              <TableHead>{t("invoices.status")}</TableHead>
              <TableHead>{t("invoices.dueDate")}</TableHead>
              <TableHead>{t("invoices.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{invoice.providerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.providerEmail}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(
                      parseInt(invoice.year),
                      parseInt(invoice.month) - 1,
                    ).toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">
                      {invoice.totalAmount.toLocaleString()}€
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {invoice.servicesCount} {t("invoices.services")}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateInvoice(invoice.providerId)}
                      disabled={
                        invoice.status === "GENERATED" ||
                        invoice.status === "PAID"
                      }
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      disabled={invoice.status === "PENDING"}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t("pagination.showing", {
                from: (pagination.page - 1) * pagination.limit + 1,
                to: Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                ),
                total: pagination.total,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                {t("pagination.previous")}
              </Button>
              <span className="text-sm">
                {t("pagination.page", {
                  page: pagination.page,
                  pages: pagination.pages,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                {t("pagination.next")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
