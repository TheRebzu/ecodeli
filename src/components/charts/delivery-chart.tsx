'use client';

import { DeliveryStatus } from '@prisma/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
export type DeliveryStatusCount = {
  status: DeliveryStatus;
  count: number;
  color: string;
};

export type DeliveryChartProps = {
  data?: DeliveryStatusCount[];
  title?: string;
  className?: string;
};

// Données par défaut pour le graphique
const DEFAULT_DATA: DeliveryStatusCount[] = [
  { status: DeliveryStatus.PENDING, count: 25, color: '#ffca3a' },
  { status: DeliveryStatus.IN_TRANSIT, count: 18, color: '#1982c4' },
  { status: DeliveryStatus.PICKED_UP, count: 12, color: '#8ac926' },
  { status: DeliveryStatus.DELIVERED, count: 35, color: '#06d6a0' },
  { status: DeliveryStatus.CANCELLED, count: 8, color: '#e71d36' },
  { status: DeliveryStatus.FAILED, count: 5, color: '#ff595e' },
  { status: DeliveryStatus.STORED, count: 10, color: '#6a4c93' },
];

// Fonction pour formatter le statut pour l'affichage
function formatStatus(status: DeliveryStatus): string {
  const statusMap: Record<DeliveryStatus, string> = {
    [DeliveryStatus.PENDING]: 'En attente',
    [DeliveryStatus.PICKED_UP]: 'Récupérée',
    [DeliveryStatus.IN_TRANSIT]: 'En transit',
    [DeliveryStatus.STORED]: 'En stockage',
    [DeliveryStatus.DELIVERED]: 'Livrée',
    [DeliveryStatus.CANCELLED]: 'Annulée',
    [DeliveryStatus.FAILED]: 'Échouée',
  };
  
  return statusMap[status] || status;
}

export default function DeliveryChart({
  data = DEFAULT_DATA,
  title = 'Livraisons par statut',
  className = '',
}: DeliveryChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  // Gestionnaires d'événements pour l'interactivité
  const handleMouseEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  // Fonction pour rendre l'étiquette personnalisée sur les segments du graphique
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0.05 ? (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontWeight: activeIndex === index ? 'bold' : 'normal' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 shadow-lg rounded-md border border-border">
          <p className="font-medium">{formatStatus(data.status)}</p>
          <p>
            <span className="font-medium">{data.count}</span> livraisons
          </p>
          <p className="text-xs text-muted-foreground">
            {((data.count / totalCount) * 100).toFixed(1)}% du total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={110}
                innerRadius={60}
                fill="#8884d8"
                dataKey="count"
                nameKey="status"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? '#fff' : 'transparent'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => formatStatus(value as DeliveryStatus)}
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
