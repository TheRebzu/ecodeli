import { UserRole, UserStatus } from '@prisma/client';
import { BarChart, PieChart, MapPin } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, PieChart as RechartsPieChart, Cell, Legend } from 'recharts';

import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserStatsData } from '@/types/admin';

interface UserStatsProps {
  data: UserStatsData;
}

export function UserStats({ data }: UserStatsProps) {
  // Couleurs pour les graphiques
  const COLORS = {
    CLIENT: '#3b82f6',  // bleu
    DELIVERER: '#22c55e', // vert
    MERCHANT: '#f97316', // orange
    PROVIDER: '#0ea5e9', // bleu ciel
    ADMIN: '#a855f7',    // violet
    
    ACTIVE: '#22c55e',   // vert
    INACTIVE: '#94a3b8', // gris
    SUSPENDED: '#ef4444', // rouge
    PENDING_VERIFICATION: '#f59e0b', // ambre
    
    verified: '#10b981',  // vert émeraude
    unverified: '#f59e0b', // ambre
  };

  // Données pour le graphique des rôles
  const roleData = Object.entries(data.usersByRole).map(([role, count]) => ({
    name: role,
    value: count,
    color: COLORS[role as UserRole] || '#94a3b8',
  }));

  // Données pour le graphique des statuts
  const statusData = Object.entries(data.usersByStatus).map(([status, count]) => ({
    name: status,
    value: count,
    color: COLORS[status as UserStatus] || '#94a3b8',
  }));

  // Données pour le graphique de vérification
  const verificationData = [
    { name: 'Vérifiés', value: data.usersByVerification.verified, color: COLORS.verified },
    { name: 'Non vérifiés', value: data.usersByVerification.unverified, color: COLORS.unverified },
  ];

  // Données pour le graphique des inscriptions dans le temps
  const registrationsData = data.registrationsOverTime || [];

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total des utilisateurs"
          value={data.totalUsers}
          description="Tous les utilisateurs enregistrés"
        />
        <StatCard
          title="Utilisateurs actifs"
          value={data.activeUsers}
          description={`${Math.round((data.activeUsers / data.totalUsers) * 100)}% du total`}
        />
        <StatCard
          title="Nouveaux aujourd'hui"
          value={data.newUsersToday}
          description="Inscriptions du jour"
        />
        <StatCard
          title="Nouveaux ce mois"
          value={data.newUsersThisMonth}
          description="Inscriptions mensuelles"
        />
      </div>

      {/* Graphiques */}
      <Tabs defaultValue="distribution">
        <TabsList>
          <TabsTrigger value="distribution" className="flex items-center">
            <PieChart className="h-4 w-4 mr-2" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center">
            <BarChart className="h-4 w-4 mr-2" />
            Tendances
          </TabsTrigger>
          <TabsTrigger value="geography" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Géographie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Répartition par rôle */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Répartition par rôle</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {roleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} utilisateurs`, 'Nombre']} />
                      <Legend formatter={(value) => translateRole(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Répartition par statut */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Répartition par statut</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${translateStatus(name)} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} utilisateurs`, 'Nombre']} />
                      <Legend formatter={(value) => translateStatus(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Répartition par vérification */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Statut de vérification</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={verificationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {verificationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} utilisateurs`, 'Nombre']} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          {/* Graphique des inscriptions dans le temps */}
          <Card>
            <CardHeader>
              <CardTitle>Inscriptions mensuelles</CardTitle>
              <CardDescription>
                Tendance des inscriptions dans le temps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={registrationsData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.toLocaleString('fr-FR', { month: 'short' })} ${d.getFullYear()}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} utilisateurs`, 'Inscriptions']}
                      labelFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="Inscriptions" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography">
          {/* Carte des utilisateurs par pays */}
          <Card>
            <CardHeader>
              <CardTitle>Principaux pays</CardTitle>
              <CardDescription>
                Répartition des utilisateurs par pays
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={data.topCountries}
                    layout="vertical"
                    margin={{
                      top: 20,
                      right: 30,
                      left: 60,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="country" 
                      type="category" 
                      tick={{ fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip formatter={(value) => [`${value} utilisateurs`, 'Nombre']} />
                    <Bar dataKey="count" fill="#10b981" name="Utilisateurs" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Composant de carte statistique simple
function StatCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-2xl font-bold">{value.toLocaleString('fr-FR')}</div>
        <div className="text-sm font-medium mt-1">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      </CardContent>
    </Card>
  );
}

// Fonction pour traduire les rôles
function translateRole(role: string): string {
  const translations: Record<string, string> = {
    CLIENT: 'Clients',
    DELIVERER: 'Livreurs',
    MERCHANT: 'Marchands',
    PROVIDER: 'Prestataires',
    ADMIN: 'Administrateurs',
  };
  return translations[role] || role;
}

// Fonction pour traduire les statuts
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    ACTIVE: 'Actifs',
    INACTIVE: 'Inactifs',
    SUSPENDED: 'Suspendus',
    PENDING_VERIFICATION: 'En attente',
  };
  return translations[status] || status;
} 