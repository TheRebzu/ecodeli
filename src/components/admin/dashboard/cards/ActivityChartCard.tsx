'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityChartData } from '@/types/dashboard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { BarChartIcon, TruckIcon, CreditCardIcon, UserPlusIcon } from 'lucide-react';

interface ActivityChartCardProps {
  data?: ActivityChartData;
  expanded?: boolean;
}

const ActivityChartCard = ({ data, expanded = false }: ActivityChartCardProps) => {
  const [activeChart, setActiveChart] = useState('all');

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <BarChartIcon className="h-5 w-5 mr-2" />
            Activité de la plateforme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-60">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Préparation des données pour le graphique combiné
  const combinedData = data.deliveries.map((item, index) => ({
    date: item.date,
    livraisons: item.value,
    transactions: data.transactions[index]?.value || 0,
    inscriptions: data.registrations[index]?.value || 0,
  }));

  // Formatter la date pour l'affichage
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  // Configurer les couleurs des graphiques
  const chartColors = {
    livraisons: '#10b981', // vert
    transactions: '#8b5cf6', // violet
    inscriptions: '#3b82f6', // bleu
  };

  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <BarChartIcon className="h-5 w-5 mr-2" />
          Activité de la plateforme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeChart} onValueChange={setActiveChart}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="deliveries" className="flex items-center justify-center">
              <TruckIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Livraisons</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center justify-center">
              <CreditCardIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="registrations" className="flex items-center justify-center">
              <UserPlusIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Inscriptions</span>
            </TabsTrigger>
          </TabsList>

          <div className="h-[320px] mt-4">
            <TabsContent value="all" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                    width={30}
                  />
                  <Tooltip
                    formatter={value => [value, '']}
                    labelFormatter={formatDate}
                    contentStyle={{
                      border: 'none',
                      borderRadius: '0.375rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={value => {
                      const translations: Record<string, string> = {
                        livraisons: 'Livraisons',
                        transactions: 'Transactions',
                        inscriptions: 'Inscriptions',
                      };
                      return translations[value] || value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="livraisons"
                    stroke={chartColors.livraisons}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="livraisons"
                  />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke={chartColors.transactions}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="transactions"
                  />
                  <Line
                    type="monotone"
                    dataKey="inscriptions"
                    stroke={chartColors.inscriptions}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="inscriptions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="deliveries" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.deliveries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                    width={30}
                  />
                  <Tooltip
                    formatter={value => [`${value} livraisons`, '']}
                    labelFormatter={formatDate}
                    contentStyle={{
                      border: 'none',
                      borderRadius: '0.375rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={chartColors.livraisons}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Livraisons"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="transactions" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.transactions}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                    width={30}
                  />
                  <Tooltip
                    formatter={value => [`${value} transactions`, '']}
                    labelFormatter={formatDate}
                    contentStyle={{
                      border: 'none',
                      borderRadius: '0.375rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={chartColors.transactions}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Transactions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="registrations" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.registrations}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                    width={30}
                  />
                  <Tooltip
                    formatter={value => [`${value} inscriptions`, '']}
                    labelFormatter={formatDate}
                    contentStyle={{
                      border: 'none',
                      borderRadius: '0.375rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={chartColors.inscriptions}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Inscriptions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ActivityChartCard;
