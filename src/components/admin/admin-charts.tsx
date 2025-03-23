"use client";

import React from 'react';
import {
  Area,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Types for chart data
type UserChartData = {
  month: string;
  client: number;
  courier: number;
  merchant: number;
  provider: number;
};

type ShipmentChartData = {
  day: string;
  pending: number;
  in_transit: number;
  delivered: number;
  cancelled: number;
};

interface AdminUserChartProps {
  data: UserChartData[];
  title?: string;
  description?: string;
}

interface AdminShipmentChartProps {
  data: ShipmentChartData[];
  title?: string;
  description?: string;
}

export function AdminUserChart({ 
  data, 
  title = "Nouveaux utilisateurs", 
  description = "Nombre de nouveaux utilisateurs par rôle" 
}: AdminUserChartProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 10, right: 25, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar name="Clients" dataKey="client" fill="#2563eb" />
            <Bar name="Livreurs" dataKey="courier" fill="#16a34a" />
            <Bar name="Commerçants" dataKey="merchant" fill="#ca8a04" />
            <Bar name="Fournisseurs" dataKey="provider" fill="#9333ea" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function AdminShipmentChart({ 
  data, 
  title = "État des livraisons", 
  description = "Évolution des livraisons par statut" 
}: AdminShipmentChartProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 10, right: 25, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              name="En attente" 
              dataKey="pending" 
              stackId="1" 
              stroke="#f59e0b" 
              fill="#fbbf24" />
            <Area 
              type="monotone" 
              name="En transit" 
              dataKey="in_transit" 
              stackId="1" 
              stroke="#3b82f6" 
              fill="#60a5fa" />
            <Area 
              type="monotone" 
              name="Livrées" 
              dataKey="delivered" 
              stackId="1" 
              stroke="#10b981" 
              fill="#34d399" />
            <Area 
              type="monotone" 
              name="Annulées" 
              dataKey="cancelled" 
              stackId="1" 
              stroke="#ef4444" 
              fill="#f87171" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 