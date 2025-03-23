"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideArrowDown, LucideArrowUp } from "lucide-react";

type RevenueChartProps = {
  data: { month: string; amount: number }[];
  title?: string;
  description?: string;
  className?: string;
};

export function RevenueChart({
  data,
  title = "Évolution des revenus",
  description = "Chiffre d'affaires mensuel",
  className = "",
}: RevenueChartProps) {
  // Déterminer la couleur en fonction de la tendance
  const isIncreasing = data.length >= 2 && data[data.length - 1].amount > data[data.length - 2].amount;
  
  // Calculer le pourcentage de variation
  const lastValue = data[data.length - 1]?.amount || 0;
  const previousValue = data[data.length - 2]?.amount || 0;
  const percentageChange = previousValue === 0
    ? lastValue > 0 ? 100 : 0
    : Math.round(((lastValue - previousValue) / previousValue) * 100);
  
  // Calculer le total des revenus
  const totalRevenue = data.reduce((sum, item) => sum + item.amount, 0);
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <CardDescription className="flex flex-col">
          <div className="flex items-center justify-between">
            <span>{description}</span>
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${isIncreasing ? 'text-green-600' : 'text-red-600'}`}>
              {isIncreasing ? <LucideArrowUp className="h-3 w-3" /> : <LucideArrowDown className="h-3 w-3" />}
              {percentageChange}%
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold">
            {totalRevenue.toLocaleString()} €
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="h-[300px]">
          <div className="flex items-center justify-end mb-3">
            <TabsList>
              <TabsTrigger value="bar">Barres</TabsTrigger>
              <TabsTrigger value="line">Ligne</TabsTrigger>
            </TabsList>
          </div>
          
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
                  tickFormatter={(value) => `${value / 1000}k`}
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
                  formatter={(value) => [`${Number(value).toLocaleString()} €`, 'Revenu']}
                />
                <Bar
                  dataKey="amount"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="line" className="h-[235px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
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
                  formatter={(value) => [`${Number(value).toLocaleString()} €`, 'Revenu']}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 