"use client";

import * as React from "react";
import { AreaChart as TremorAreaChart } from "@tremor/react";
import { BarChart as TremorBarChart } from "@tremor/react";
import { LineChart as TremorLineChart } from "@tremor/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  colors,
  valueFormatter = (value) => `${value}`,
  className = ""}: PieChartProps) {
  // TODO: Implémenter avec recharts ou autre, car @tremor/react n'a pas de PieChart
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
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <span>
          PieChart non supporté par @tremor/react. À implémenter avec recharts.
        </span>
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
