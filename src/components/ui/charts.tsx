"use client";

import * as React from "react";
import { AreaChart as TremorAreaChart } from "@tremor/react";
import { BarChart as TremorBarChart } from "@tremor/react";
import { LineChart as TremorLineChart } from "@tremor/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Types communs pour les graphiques
interface BaseChartProps {
  title?: string;
  description?: string;
  data: any[];
  categories: string[];
  index: string;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  showGridLines?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  startEndOnly?: boolean;
  className?: string;
}

interface LineChartProps extends BaseChartProps {
  comparisonData?: any[];
}

interface BarChartProps extends BaseChartProps {
  layout?: "vertical" | "horizontal";
}

interface PieChartProps {
  title?: string;
  description?: string;
  data: any[];
  category: string;
  index: string;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

// Composant de graphique linéaire
export function LineChart({
  title,
  description,
  data,
  comparisonData,
  categories,
  index,
  colors = ["#3b82f6"],
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  showXAxis = true,
  showYAxis = true,
  startEndOnly = false,
  className = ""}: LineChartProps) {
  return (
    <div className={className}>
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <TremorLineChart
        data={data}
        index={index}
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        showLegend={showLegend}
        showGridLines={showGridLines}
        showXAxis={showXAxis}
        showYAxis={showYAxis}
        startEndOnly={startEndOnly}
        curveType="natural"
        connectNulls={true}
        className="h-full"
      />
    </div>
  );
}

// Composant de graphique à barres
export function BarChart({
  title,
  description,
  data,
  categories,
  index,
  colors = ["#3b82f6"],
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  layout = "horizontal",
  className = ""}: BarChartProps) {
  return (
    <div className={className}>
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <TremorBarChart
        data={data}
        index={index}
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        showLegend={showLegend}
        showGridLines={showGridLines}
        layout={layout}
        className="h-full"
      />
    </div>
  );
}

// Composant de graphique en aires
export function AreaChart({
  title,
  description,
  data,
  categories,
  index,
  colors = ["#3b82f6"],
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  showXAxis = true,
  showYAxis = true,
  startEndOnly = false,
  className = ""}: BaseChartProps) {
  return (
    <div className={className}>
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <TremorAreaChart
        data={data}
        index={index}
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        showLegend={showLegend}
        showGridLines={showGridLines}
        showXAxis={showXAxis}
        showYAxis={showYAxis}
        startEndOnly={startEndOnly}
        curveType="natural"
        className="h-full"
      />
    </div>
  );
}

// Composant de graphique en camembert
export function PieChart({
  title,
  description,
  data,
  category,
  index,
  colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"],
  valueFormatter = (value) => `${value}`,
  className = ""}: PieChartProps) {
  
  // Préparer les données pour recharts
  const chartData = data.map((item, idx) => ({
    name: item[index],
    value: item[category],
    color: colors[idx % colors.length]
  }));

  return (
    <div className={className}>
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => valueFormatter(Number(value))} />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Composant de carte avec graphique
export function ChartCard({
  title,
  description,
  children}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
