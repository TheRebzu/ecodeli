"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
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

// Types
type MonthlySales = {
  month: string
  chiffreAffaires: number
  objectif: number
}

// Client component that receives data as props
function SalesChartContent({ chartData }: { chartData: MonthlySales[] }) {
  const chartConfig = {
    chiffreAffaires: {
      label: "Chiffre d'affaires",
      color: "hsl(var(--chart-1))",
    },
    objectif: {
      label: "Objectif",
      color: "hsl(var(--chart-2))",
    },
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-[4/3] w-full"
    >
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value / 1000}k €`}
        />
        <ChartTooltip content={
          <ChartTooltipContent 
            formatter={(value) => [`${Number(value).toLocaleString()} €`]}
          />
        } />
        <Bar
          dataKey="chiffreAffaires"
          radius={[4, 4, 0, 0]}
          fill="var(--color-chiffreAffaires)"
        />
        <Bar
          dataKey="objectif"
          radius={[4, 4, 0, 0]}
          fill="var(--color-objectif)"
        />
        <Legend />
      </BarChart>
    </ChartContainer>
  )
}

// Default data for development/fallback
const defaultData: MonthlySales[] = [
  { month: 'Jan', chiffreAffaires: 4200, objectif: 5000 },
  { month: 'Fév', chiffreAffaires: 4800, objectif: 5000 },
  { month: 'Mar', chiffreAffaires: 5500, objectif: 5000 },
  { month: 'Avr', chiffreAffaires: 5700, objectif: 6000 },
  { month: 'Mai', chiffreAffaires: 6200, objectif: 6000 },
  { month: 'Juin', chiffreAffaires: 5900, objectif: 6000 },
]

export function BarChartExample({ data }: { data?: MonthlySales[] }) {
  // Use provided data or fallback to default
  const chartData = data || defaultData;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chiffre d&apos;affaires mensuel</CardTitle>
        <CardDescription>Comparaison CA et objectifs sur l&apos;année</CardDescription>
      </CardHeader>
      <CardContent>
        <SalesChartContent chartData={chartData} />
      </CardContent>
    </Card>
  )
}
