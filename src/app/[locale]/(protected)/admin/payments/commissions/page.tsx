'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CommissionDashboard, CommissionReport } from '@/components/payments/commission-dashboard';
import { api } from '@/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Données de test pour les commissions
const mockCommissionReport: CommissionReport = {
  period: {
    startDate: new Date('2025-05-01'),
    endDate: new Date('2025-05-31')
  },
  totalPayments: 237,
  totalAmount: 9845.75,
  totalCommission: 1752.38,
  breakdown: {
    delivery: {
      count: 189,
      commission: 1265.43
    },
    service: {
      count: 42,
      commission: 427.95
    },
    subscription: {
      count: 6,
      commission: 59.00
    }
  }
};

export default function AdminCommissionsPage() {
  const t = useTranslations('commissions');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<CommissionReport>(mockCommissionReport);
  const [error, setError] = useState<string | null>(null);

  // Simuler le chargement des données pour une période spécifique
  const handleDateRangeChange = async (startDate: Date, endDate: Date) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simuler un appel réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dans une vraie app, on utiliserait tRPC ici
      // const response = await api.admin.commissions.getCommissionReport.mutate({ startDate, endDate });
      
      // Générer des données mock variables selon la période
      const monthDiff = startDate.getMonth() - new Date().getMonth() + 
                       (12 * (startDate.getFullYear() - new Date().getFullYear()));
      
      // Ajuster les données selon la période sélectionnée pour simuler différents rapports
      const varianceFactor = Math.abs(monthDiff) * 0.1 + 0.9;
      
      const newReport: CommissionReport = {
        period: {
          startDate,
          endDate
        },
        totalPayments: Math.round(mockCommissionReport.totalPayments * varianceFactor),
        totalAmount: Math.round(mockCommissionReport.totalAmount * varianceFactor * 100) / 100,
        totalCommission: Math.round(mockCommissionReport.totalCommission * varianceFactor * 100) / 100,
        breakdown: {
          delivery: {
            count: Math.round(mockCommissionReport.breakdown.delivery.count * varianceFactor),
            commission: Math.round(mockCommissionReport.breakdown.delivery.commission * varianceFactor * 100) / 100
          },
          service: {
            count: Math.round(mockCommissionReport.breakdown.service.count * varianceFactor),
            commission: Math.round(mockCommissionReport.breakdown.service.commission * varianceFactor * 100) / 100
          },
          subscription: {
            count: Math.round(mockCommissionReport.breakdown.subscription.count * varianceFactor),
            commission: Math.round(mockCommissionReport.breakdown.subscription.commission * varianceFactor * 100) / 100
          }
        }
      };
      
      setReport(newReport);
    } catch (err) {
      console.error("Erreur lors du chargement des données de commission", err);
      setError(t('errorLoadingData'));
    } finally {
      setIsLoading(false);
    }
  };

  // Simuler le téléchargement d'un fichier CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dans une vraie app, on utiliserait tRPC ici
      // await api.admin.commissions.exportCsv.mutate({ 
      //   startDate: report.period.startDate,
      //   endDate: report.period.endDate
      // });
      
      // Simuler la création et le téléchargement d'un fichier CSV
      const fileName = `commissions_${format(report.period.startDate, 'yyyy-MM-dd', { locale: fr })}_${format(report.period.endDate, 'yyyy-MM-dd', { locale: fr })}.csv`;
      console.log(`Exporting CSV: ${fileName}`);
      
      // Création d'un contenu CSV simple pour démonstration
      const csvContent = [
        "Type,Nombre,Montant commission",
        `Livraisons,${report.breakdown.delivery.count},${report.breakdown.delivery.commission}`,
        `Services,${report.breakdown.service.count},${report.breakdown.service.commission}`,
        `Abonnements,${report.breakdown.subscription.count},${report.breakdown.subscription.commission}`,
        `TOTAL,${report.totalPayments},${report.totalCommission}`
      ].join("\n");
      
      // Code pour déclencher le téléchargement (pour démonstration)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur lors de l'exportation CSV", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Simuler un rafraîchissement des données
  const handleRefresh = () => {
    handleDateRangeChange(report.period.startDate, report.period.endDate);
  };

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={handleRefresh}>{t('tryAgain')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <CommissionDashboard
        report={report}
        isLoading={isLoading}
        onDateRangeChange={handleDateRangeChange}
        onExportCSV={handleExportCSV}
        onRefresh={handleRefresh}
      />
    </div>
  );
} 