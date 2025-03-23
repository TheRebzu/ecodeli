'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
export type PerformanceMetric = {
  category: string;
  value: number;
  fullMark: number;
};

export type ProviderPerformance = {
  name: string;
  metrics: PerformanceMetric[];
  color: string;
};

export type PerformanceChartProps = {
  data?: ProviderPerformance[];
  title?: string;
  className?: string;
};

// Données par défaut pour le graphique
const DEFAULT_DATA: ProviderPerformance[] = [
  {
    name: 'Prestataire A',
    color: '#6366f1',
    metrics: [
      { category: 'Ponctualité', value: 85, fullMark: 100 },
      { category: 'Qualité', value: 90, fullMark: 100 },
      { category: 'Prix', value: 70, fullMark: 100 },
      { category: 'Communication', value: 80, fullMark: 100 },
      { category: 'Fiabilité', value: 85, fullMark: 100 },
      { category: 'Satisfaction', value: 92, fullMark: 100 },
    ],
  },
  {
    name: 'Prestataire B',
    color: '#f43f5e',
    metrics: [
      { category: 'Ponctualité', value: 75, fullMark: 100 },
      { category: 'Qualité', value: 95, fullMark: 100 },
      { category: 'Prix', value: 85, fullMark: 100 },
      { category: 'Communication', value: 70, fullMark: 100 },
      { category: 'Fiabilité', value: 80, fullMark: 100 },
      { category: 'Satisfaction', value: 88, fullMark: 100 },
    ],
  },
  {
    name: 'Prestataire C',
    color: '#10b981',
    metrics: [
      { category: 'Ponctualité', value: 90, fullMark: 100 },
      { category: 'Qualité', value: 80, fullMark: 100 },
      { category: 'Prix', value: 78, fullMark: 100 },
      { category: 'Communication', value: 90, fullMark: 100 },
      { category: 'Fiabilité', value: 75, fullMark: 100 },
      { category: 'Satisfaction', value: 85, fullMark: 100 },
    ],
  },
];

/**
 * Prépare les données pour le graphique radar
 */
function formatDataForRadar(data: ProviderPerformance[]) {
  // Obtenir toutes les catégories uniques
  const categories = [...new Set(data.flatMap(provider => provider.metrics.map(m => m.category)))];
  
  // Créer un tableau de données pour le graphique radar
  return categories.map(category => {
    const result: Record<string, any> = { category };
    
    // Ajouter les valeurs pour chaque prestataire
    data.forEach(provider => {
      const metric = provider.metrics.find(m => m.category === category);
      result[provider.name] = metric ? metric.value : 0;
    });
    
    return result;
  });
}

export default function PerformanceChart({
  data = DEFAULT_DATA,
  title = 'Performance des prestataires',
  className = '',
}: PerformanceChartProps) {
  // Préparer les données pour le graphique radar
  const chartData = useMemo(() => formatDataForRadar(data), [data]);
  
  // Calculer la performance moyenne pour chaque prestataire
  const averages = useMemo(() => {
    return data.map(provider => ({
      name: provider.name,
      color: provider.color,
      average: Math.round(provider.metrics.reduce((sum, metric) => sum + metric.value, 0) / provider.metrics.length),
    }));
  }, [data]);
  
  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 shadow-lg rounded-md border border-border">
          <p className="font-medium">{payload[0].payload.category}</p>
          <div className="mt-1 space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm">
                <span 
                  className="inline-block w-3 h-3 mr-1 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                {entry.name}: <span className="font-medium">{entry.value}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-wrap gap-4 mt-2">
          {averages.map((provider, index) => (
            <div key={index} className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: provider.color }}
              ></span>
              <span className="text-sm">{provider.name}</span>
              <span 
                className="text-sm font-bold"
                title="Note moyenne"
              >
                {provider.average}/100
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="80%" 
              data={chartData}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              
              {data.map((provider, index) => (
                <Radar
                  key={index}
                  name={provider.name}
                  dataKey={provider.name}
                  stroke={provider.color}
                  fill={provider.color}
                  fillOpacity={0.2}
                />
              ))}
              
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
