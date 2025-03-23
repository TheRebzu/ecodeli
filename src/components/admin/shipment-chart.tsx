'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LucideArrowDown, LucideArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';

type ShipmentChartProps = {
  className?: string;
};

// Données d'exemple pour les livraisons mensuelles
const generateDemoData = () => {
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
  return months.map((month, i) => {
    const base = 10 + Math.floor(Math.random() * 40);
    return {
      month,
      count: base + (i * 5),
    };
  });
};

export function ShipmentChart({ className = "" }: ShipmentChartProps) {
  const [data, setData] = useState(generateDemoData());

  // Optionnellement, on pourrait récupérer les données depuis l'API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const response = await fetch('/api/admin/shipments-stats');
  //       const data = await response.json();
  //       setData(data);
  //     } catch (error) {
  //       console.error('Erreur de chargement des statistiques:', error);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // Calcul de la tendance
  const getTrendPercentage = () => {
    if (data.length < 2) return 0;
    const lastValue = data[data.length - 1].count;
    const previousValue = data[data.length - 2].count;
    return previousValue === 0
      ? lastValue > 0 ? 100 : 0
      : Math.round(((lastValue - previousValue) / previousValue) * 100);
  };

  const trendPercentage = getTrendPercentage();
  const isIncreasing = trendPercentage >= 0;

  // Calcul du total
  const totalShipments = data.reduce((sum, item) => sum + item.count, 0);
  
  // Gradient pour l'area chart
  const gradientId = "shipmentGradient";
  const gradientColor = isIncreasing ? 
    "hsl(var(--success))" : 
    "hsl(var(--destructive))";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Livraisons</CardTitle>
        <CardDescription className="flex flex-col">
          <div className="flex items-center justify-between">
            <span>Évolution mensuelle</span>
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${isIncreasing ? 'text-green-600' : 'text-red-600'}`}>
              {isIncreasing ? <LucideArrowUp className="h-3 w-3" /> : <LucideArrowDown className="h-3 w-3" />}
              {Math.abs(trendPercentage)}%
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold">
            {totalShipments} livraisons
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="area" className="h-[300px]">
          <div className="flex items-center justify-end mb-3">
            <TabsList>
              <TabsTrigger value="area">Zone</TabsTrigger>
              <TabsTrigger value="bar">Barres</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="area" className="h-[235px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => [`${value} livraisons`, 'Quantité']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={gradientColor}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="bar" className="h-[235px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => [`${value} livraisons`, 'Quantité']}
                />
                <Bar
                  dataKey="count"
                  fill={gradientColor}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}