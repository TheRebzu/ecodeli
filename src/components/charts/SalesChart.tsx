'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
export type MonthlySales = {
  month: string;
  chiffreAffaires: number;
  objectif: number;
};

export type SalesChartProps = {
  data?: MonthlySales[];
  title?: string;
  className?: string;
};

// Noms des mois en français
const MONTH_NAMES = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

// Données par défaut pour le graphique
const DEFAULT_DATA: MonthlySales[] = [
  { month: 'Jan', chiffreAffaires: 4200, objectif: 5000 },
  { month: 'Fév', chiffreAffaires: 4800, objectif: 5000 },
  { month: 'Mar', chiffreAffaires: 5500, objectif: 5000 },
  { month: 'Avr', chiffreAffaires: 5700, objectif: 6000 },
  { month: 'Mai', chiffreAffaires: 6200, objectif: 6000 },
  { month: 'Juin', chiffreAffaires: 5900, objectif: 6000 },
  { month: 'Juil', chiffreAffaires: 6800, objectif: 7000 },
  { month: 'Août', chiffreAffaires: 6500, objectif: 7000 },
  { month: 'Sep', chiffreAffaires: 7100, objectif: 7000 },
  { month: 'Oct', chiffreAffaires: 7500, objectif: 8000 },
  { month: 'Nov', chiffreAffaires: 8200, objectif: 8000 },
  { month: 'Déc', chiffreAffaires: 9100, objectif: 8000 },
];

// Fonction pour formater les montants en euros
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SalesChart({
  data = DEFAULT_DATA,
  title = 'Chiffre d\'affaires mensuel',
  className = '',
}: SalesChartProps) {
  // Calculs mémorisés pour éviter les recalculs inutiles
  const { totalSales, averageSales, avgObjective, percentAchievement } = useMemo(() => {
    const total = data.reduce((sum, month) => sum + month.chiffreAffaires, 0);
    const average = Math.round(total / data.length);
    const avgObj = Math.round(data.reduce((sum, month) => sum + month.objectif, 0) / data.length);
    const percent = Math.round((total / data.reduce((sum, month) => sum + month.objectif, 0)) * 100);
    
    return {
      totalSales: total,
      averageSales: average,
      avgObjective: avgObj,
      percentAchievement: percent,
    };
  }, [data]);

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-border">
          <p className="font-bold text-sm">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="inline-block w-4 h-2 bg-blue-500 mr-2"></span>
              CA: <span className="font-medium">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-sm">
              <span className="inline-block w-4 h-2 bg-orange-400 mr-2"></span>
              Objectif: <span className="font-medium">{formatCurrency(payload[1].value)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {payload[0].value >= payload[1].value 
                ? `+${Math.round((payload[0].value / payload[1].value - 1) * 100)}% de l'objectif` 
                : `${Math.round((payload[0].value / payload[1].value) * 100)}% de l'objectif`}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <CardTitle>{title}</CardTitle>
        <div className="grid grid-cols-3 gap-4 mt-2 mb-2 text-center">
          <div className="bg-muted/50 p-2 rounded-md">
            <p className="text-xs text-muted-foreground">Total CA</p>
            <p className="font-bold">{formatCurrency(totalSales)}</p>
          </div>
          <div className="bg-muted/50 p-2 rounded-md">
            <p className="text-xs text-muted-foreground">Moyenne mensuelle</p>
            <p className="font-bold">{formatCurrency(averageSales)}</p>
          </div>
          <div className="bg-muted/50 p-2 rounded-md">
            <p className="text-xs text-muted-foreground">Objectif atteint</p>
            <p className={`font-bold ${percentAchievement >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
              {percentAchievement}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value / 1000}k €`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ paddingBottom: 10 }}
                formatter={(value) => value === 'chiffreAffaires' ? 'Chiffre d\'affaires' : 'Objectif'}
              />
              <ReferenceLine 
                y={avgObjective} 
                stroke="#f59e0b" 
                strokeDasharray="3 3"
                label={{ 
                  value: 'Obj. moyen', 
                  position: 'insideBottomRight',
                  fill: '#f59e0b',
                  fontSize: 12
                }} 
              />
              <Bar 
                dataKey="chiffreAffaires" 
                name="Chiffre d'affaires"
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Bar 
                dataKey="objectif" 
                name="Objectif"
                fill="#f97316" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
                fillOpacity={0.4}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
