"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Legend,
  Tooltip,
  ResponsiveContainer
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

// Types
type ProviderMetric = {
  category: string;
  value: number;
  fullMark: number;
}

type ProviderPerformance = {
  name: string;
  metrics: ProviderMetric[];
  color: string;
}

// Client component that receives data as props
function PerformanceChartContent({ providerData }: { providerData: ProviderPerformance[] }) {
  // Transformer les données pour le graphique radar
  // Chaque catégorie doit être une propriété distincte pour chaque prestataire
  const radarData = providerData[0].metrics.map((metric) => {
    const dataPoint: Record<string, any> = {
      category: metric.category,
    };
    
    // Ajouter les valeurs pour chaque prestataire
    providerData.forEach((provider) => {
      const providerMetric = provider.metrics.find(m => m.category === metric.category);
      dataPoint[provider.name] = providerMetric ? providerMetric.value : 0;
    });
    
    return dataPoint;
  });
  
  // Créer la configuration des couleurs dynamiquement à partir des données
  const chartConfig = providerData.reduce<Record<string, { label: string, color: string }>>(
    (config, provider) => {
      config[provider.name] = {
        label: provider.name,
        color: provider.color,
      };
      return config;
    },
    {}
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-[4/3] w-full"
    >
      <RadarChart
        data={radarData}
        cx="50%"
        cy="50%"
        outerRadius={80}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="category" />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        
        {providerData.map((provider) => (
          <Radar
            key={provider.name}
            name={provider.name}
            dataKey={provider.name}
            stroke={provider.color}
            fill={provider.color}
            fillOpacity={0.2}
          />
        ))}
        
        <Legend />
        <ChartTooltip content={<ChartTooltipContent />} />
      </RadarChart>
    </ChartContainer>
  )
}

// Default data for development/fallback
const defaultData: ProviderPerformance[] = [
  {
    name: "Prestataire A",
    color: "#6366f1",
    metrics: [
      { category: "Ponctualité", value: 85, fullMark: 100 },
      { category: "Qualité", value: 90, fullMark: 100 },
      { category: "Prix", value: 75, fullMark: 100 },
      { category: "Communication", value: 88, fullMark: 100 },
      { category: "Fiabilité", value: 92, fullMark: 100 },
    ]
  },
  {
    name: "Prestataire B",
    color: "#f43f5e",
    metrics: [
      { category: "Ponctualité", value: 70, fullMark: 100 },
      { category: "Qualité", value: 82, fullMark: 100 },
      { category: "Prix", value: 90, fullMark: 100 },
      { category: "Communication", value: 78, fullMark: 100 },
      { category: "Fiabilité", value: 84, fullMark: 100 },
    ]
  }
];

export function RadarChartExample({ data }: { data?: ProviderPerformance[] }) {
  // Use provided data or fallback to default
  const providerData = data || defaultData;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance des prestataires</CardTitle>
        <CardDescription>Comparaison des prestataires sur plusieurs critères</CardDescription>
      </CardHeader>
      <CardContent>
        <PerformanceChartContent providerData={providerData} />
      </CardContent>
    </Card>
  )
}