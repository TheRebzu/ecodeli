"use client";

import React, { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { ArrowLeft, Download, Printer, Share2 } from "lucide-react";

import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { InvoiceDetails } from "@/components/shared/payments/invoice-details";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvoiceDetailsPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function InvoiceDetailsPage({
  params,
}: InvoiceDetailsPageProps) {
  const { id, locale } = use(params);
  const t = useTranslations("Client.invoices");
  const router = useRouter();
  const { data } = useSession();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fonction pour télécharger la facture
  const handleDownload = async (invoiceId: string) => {
    try {
      // Appel API pour télécharger la facture
      const response = await fetch(`/api/invoices/${invoiceId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: t("downloadSuccess"),
        description: t("invoiceDownloaded"),
       });
    } catch (error) {
      toast({ title: t("downloadError"),
        description: t("downloadFailed"),
        variant: "destructive",
       });
    }
  };

  // Fonction pour imprimer la facture
  const handlePrint = async (invoiceId: string) => {
    try {
      window.print();
    } catch (error) {
      toast({ title: t("printError"),
        description: t("printFailed"),
        variant: "destructive",
       });
    }
  };

  // Fonction pour partager la facture
  const handleShareInvoice = () => {
    if (navigator.share) {
      navigator
        .share({ title: t("shareInvoiceTitle"),
          text: t("shareInvoiceText"),
          url: window.location.href,
         })
        .catch((err) => {
          console.error("Erreur lors du partage:", err);
        });
    } else {
      // Copier l'URL dans le presse-papier si le partage n'est pas disponible
      navigator.clipboard.writeText(window.location.href);
      toast({ variant: "default",
        title: t("linkCopied"),
       });
    }
  };

  // Fonction pour revenir à la liste des factures
  const handleBack = () => {
    router.push(`/${locale}/client/invoices`);
  };

  // Fonction pour voir l'historique de paiement
  const handleViewPaymentHistory = () => {
    router.push(`/${locale}/client/payments`);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToInvoices")}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint(id)}
            disabled={isPrinting}
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("print")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(id)}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("download")}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                {t("share")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShareInvoice}>
                {t("copyLink")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `mailto:?subject=${t("shareInvoiceTitle")}&body=${window.location.href}`,
                  )
                }
              >
                {t("shareByEmail")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contenu principal */}
      <InvoiceDetails
        invoiceId={id}
        onBack={handleBack}
        onDownload={handleDownload}
        onPrint={handlePrint}
      />

      {/* Actions supplémentaires */}
      <Separator className="my-6" />
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button variant="outline" onClick={handleViewPaymentHistory}>
          {t("viewPaymentHistory")}
        </Button>
      </div>
    </div>
  );
}
