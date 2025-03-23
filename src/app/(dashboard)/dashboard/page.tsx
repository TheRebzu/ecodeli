import { BarChartExample } from "@/components/examples/bar-chart";
import { PieChartExample } from "@/components/examples/pie-chart";
import { RadarChartExample } from "@/components/examples/radar-chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DeliveryStatus } from "@prisma/client";
import { 
  getDeliveryStatusData, 
  getMonthlySalesData, 
  getProviderPerformanceData 
} from "@/lib/actions/charts-data.action";

// Données de secours en cas d'erreur dans les requêtes
const fallbackSalesData = [
  { month: 'Jan', chiffreAffaires: 4200, objectif: 5000 },
  { month: 'Fév', chiffreAffaires: 4800, objectif: 5000 },
  { month: 'Mar', chiffreAffaires: 5500, objectif: 5000 },
  { month: 'Avr', chiffreAffaires: 5700, objectif: 6000 },
  { month: 'Mai', chiffreAffaires: 6200, objectif: 6000 },
  { month: 'Juin', chiffreAffaires: 5900, objectif: 6000 },
];

const fallbackStatusData = [
  { status: "PENDING" as DeliveryStatus, count: 12, color: '#ffca3a' },
  { status: "IN_TRANSIT" as DeliveryStatus, count: 24, color: '#1982c4' },
  { status: "DELIVERED" as DeliveryStatus, count: 45, color: '#06d6a0' }
];

const fallbackPerformanceData = [
  {
    name: "Prestataire A",
    color: "#6366f1",
    metrics: [
      { category: 'Ponctualité', value: 85, fullMark: 100 },
      { category: 'Qualité', value: 90, fullMark: 100 },
      { category: 'Prix', value: 75, fullMark: 100 },
      { category: 'Communication', value: 88, fullMark: 100 },
      { category: 'Fiabilité', value: 92, fullMark: 100 },
    ]
  },
  {
    name: "Prestataire B",
    color: "#f43f5e",
    metrics: [
      { category: 'Ponctualité', value: 70, fullMark: 100 },
      { category: 'Qualité', value: 82, fullMark: 100 },
      { category: 'Prix', value: 90, fullMark: 100 },
      { category: 'Communication', value: 78, fullMark: 100 },
      { category: 'Fiabilité', value: 84, fullMark: 100 },
    ]
  }
];

export default async function DashboardPage() {
  // Récupérer les données réelles depuis la base de données avec gestion d'erreur
  let salesData;
  let statusData;
  let performanceData;

  try {
    salesData = await getMonthlySalesData();
  } catch (error) {
    console.error("Erreur lors de la récupération des données de vente:", error);
    salesData = fallbackSalesData;
  }

  try {
    statusData = await getDeliveryStatusData();
  } catch (error) {
    console.error("Erreur lors de la récupération des statuts de livraison:", error);
    statusData = fallbackStatusData;
  }

  try {
    performanceData = await getProviderPerformanceData();
  } catch (error) {
    console.error("Erreur lors de la récupération des performances des prestataires:", error);
    performanceData = fallbackPerformanceData;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Bonjour 👋</h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre tableau de bord
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/profile">
            Voir mon profil
          </Link>
        </Button>
      </div>

      {/* Graphiques avec données dynamiques */}
      <div>
        <h2 className="text-xl font-semibold mb-4 px-1">Analyses et statistiques</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <BarChartExample data={salesData} />
          <PieChartExample data={statusData} />
        </div>
        
        <div className="grid gap-4 mt-4">
          <RadarChartExample data={performanceData} />
        </div>
      </div>
    </div>
  );
} 