"use client"

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { DeliveryStatus } from "@prisma/client"

// Types
type DeliveryStatusData = {
  status: DeliveryStatus;
  count: number;
  color: string;
}

// Client component that receives data as props
function StatusChartContent({ chartData }: { chartData: DeliveryStatusData[] }) {
  // Créer la configuration des couleurs dynamiquement à partir des données
  const chartConfig = chartData.reduce<Record<string, { label: string, color: string }>>(
    (config, item) => {
      config[item.status] = {
        label: formatStatusName(item.status),
        color: item.color,
      };
      return config;
    },
    {}
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-square w-full"
    >
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          strokeWidth={2}
          stroke="var(--background)"
          label={({ name, percent }) => 
            `${formatStatusName(name as DeliveryStatus)} (${(percent * 100).toFixed(0)}%)`
          }
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell 
              key={entry.status} 
              fill={entry.color} 
              style={{ filter: "brightness(1)" }}
            />
          ))}
        </Pie>
        <ChartTooltip
          content={
            <ChartTooltipContent 
              formatter={(value, name) => [
                `${value} livraisons`,
                formatStatusName(name as DeliveryStatus)
              ]} 
            />
          }
        />
      </PieChart>
    </ChartContainer>
  )
}

// Formater les noms de statuts pour l'affichage
function formatStatusName(status: DeliveryStatus): string {
  const translations: Record<DeliveryStatus, string> = {
    PENDING: "En attente",
    PICKED_UP: "Récupéré",
    IN_TRANSIT: "En transit",
    STORED: "Stocké",
    DELIVERED: "Livré",
    CANCELLED: "Annulé",
    FAILED: "Échoué"
  };
  
  return translations[status] || status;
}

// Default data for development/fallback
const defaultData: DeliveryStatusData[] = [
  { status: "PENDING" as DeliveryStatus, count: 12, color: '#ffca3a' },
  { status: "IN_TRANSIT" as DeliveryStatus, count: 24, color: '#1982c4' },
  { status: "DELIVERED" as DeliveryStatus, count: 45, color: '#06d6a0' }
];

export function PieChartExample({ data }: { data?: DeliveryStatusData[] }) {
  // Use provided data or fallback to default
  const chartData = data || defaultData;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statut des livraisons</CardTitle>
        <CardDescription>Répartition par statut actuel</CardDescription>
      </CardHeader>
      <CardContent>
        <StatusChartContent chartData={chartData} />
      </CardContent>
    </Card>
  )
} 