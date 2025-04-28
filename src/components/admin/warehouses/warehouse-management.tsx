'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  PlusCircle,
  Warehouse,
  Box,
  AlertCircle,
  Settings,
  Activity,
  Calendar,
  Percent,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types pour les entrepôts
type WarehouseStatus = 'active' | 'maintenance' | 'closed';

type StorageBox = {
  id: string;
  name: string;
  size: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  occupiedUntil: Date | null;
  clientName: string | null;
};

type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  status: WarehouseStatus;
  totalBoxes: number;
  availableBoxes: number;
  occupancyRate: number;
  boxes: StorageBox[];
};

type MaintenanceIssue = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  boxId: string | null;
  boxName: string | null;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  reportedAt: Date;
  resolvedAt: Date | null;
};

export function WarehouseManagement() {
  const t = useTranslations('admin.warehouses');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [loading] = useState(false);
  const [createWarehouseDialogOpen, setCreateWarehouseDialogOpen] = useState(false);

  // Données simulées des entrepôts
  const warehouses: Warehouse[] = [
    {
      id: '1',
      name: 'Entrepôt Central',
      address: '15 rue de la Logistique',
      city: 'Paris',
      status: 'active',
      totalBoxes: 100,
      availableBoxes: 37,
      occupancyRate: 63,
      boxes: Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `1-${i + 1}`,
          name: `Box ${i + 1}`,
          size: i % 3 === 0 ? 'S' : i % 3 === 1 ? 'M' : 'L',
          status: i < 63 ? 'occupied' : i < 68 ? 'reserved' : i < 72 ? 'maintenance' : 'available',
          occupiedUntil:
            i < 63 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          clientName: i < 63 ? `Client ${i + 1}` : null,
        })),
    },
    {
      id: '2',
      name: 'Entrepôt Nord',
      address: '42 avenue du Stockage',
      city: 'Lille',
      status: 'active',
      totalBoxes: 75,
      availableBoxes: 22,
      occupancyRate: 71,
      boxes: Array(75)
        .fill(null)
        .map((_, i) => ({
          id: `2-${i + 1}`,
          name: `Box ${i + 1}`,
          size: i % 3 === 0 ? 'S' : i % 3 === 1 ? 'M' : 'L',
          status: i < 53 ? 'occupied' : i < 58 ? 'reserved' : i < 60 ? 'maintenance' : 'available',
          occupiedUntil:
            i < 53 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          clientName: i < 53 ? `Client ${i + 100 + 1}` : null,
        })),
    },
    {
      id: '3',
      name: 'Entrepôt Sud',
      address: '8 boulevard des Expéditions',
      city: 'Marseille',
      status: 'maintenance',
      totalBoxes: 50,
      availableBoxes: 50,
      occupancyRate: 0,
      boxes: Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `3-${i + 1}`,
          name: `Box ${i + 1}`,
          size: i % 3 === 0 ? 'S' : i % 3 === 1 ? 'M' : 'L',
          status: 'maintenance',
          occupiedUntil: null,
          clientName: null,
        })),
    },
  ];

  // Problèmes de maintenance simulés
  const maintenanceIssues: MaintenanceIssue[] = [
    {
      id: '1',
      warehouseId: '1',
      warehouseName: 'Entrepôt Central',
      boxId: '1-65',
      boxName: 'Box 65',
      description: "Problème d'humidité",
      status: 'in_progress',
      priority: 'medium',
      reportedAt: new Date('2023-11-20'),
      resolvedAt: null,
    },
    {
      id: '2',
      warehouseId: '1',
      warehouseName: 'Entrepôt Central',
      boxId: '1-66',
      boxName: 'Box 66',
      description: 'Serrure défectueuse',
      status: 'pending',
      priority: 'high',
      reportedAt: new Date('2023-11-22'),
      resolvedAt: null,
    },
    {
      id: '3',
      warehouseId: '2',
      warehouseName: 'Entrepôt Nord',
      boxId: '2-58',
      boxName: 'Box 58',
      description: 'Éclairage défectueux',
      status: 'resolved',
      priority: 'low',
      reportedAt: new Date('2023-11-15'),
      resolvedAt: new Date('2023-11-18'),
    },
    {
      id: '4',
      warehouseId: '3',
      warehouseName: 'Entrepôt Sud',
      boxId: null,
      boxName: null,
      description: 'Problème de système de sécurité général',
      status: 'in_progress',
      priority: 'high',
      reportedAt: new Date('2023-11-10'),
      resolvedAt: null,
    },
  ];

  // Filtrer les problèmes de maintenance selon l'entrepôt sélectionné
  const filteredIssues = selectedWarehouse
    ? maintenanceIssues.filter(issue => issue.warehouseId === selectedWarehouse)
    : maintenanceIssues;

  // Obtenir les statistiques globales
  const globalStats = {
    totalWarehouses: warehouses.length,
    totalBoxes: warehouses.reduce((acc, warehouse) => acc + warehouse.totalBoxes, 0),
    availableBoxes: warehouses.reduce((acc, warehouse) => acc + warehouse.availableBoxes, 0),
    occupancyRate: Math.round(
      (warehouses.reduce(
        (acc, warehouse) => acc + (warehouse.totalBoxes - warehouse.availableBoxes),
        0
      ) /
        warehouses.reduce((acc, warehouse) => acc + warehouse.totalBoxes, 0)) *
        100
    ),
    maintenanceIssues: maintenanceIssues.filter(issue => issue.status !== 'resolved').length,
  };

  const getWarehouseStatusBadge = (status: WarehouseStatus) => {
    const statusConfig = {
      active: { variant: 'default', label: t('status.active') },
      maintenance: { variant: 'warning', label: t('status.maintenance') },
      closed: { variant: 'destructive', label: t('status.closed') },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getBoxStatusBadge = (status: StorageBox['status']) => {
    const statusConfig = {
      available: { variant: 'default', label: t('boxStatus.available') },
      occupied: { variant: 'secondary', label: t('boxStatus.occupied') },
      reserved: { variant: 'outline', label: t('boxStatus.reserved') },
      maintenance: { variant: 'destructive', label: t('boxStatus.maintenance') },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getIssueStatusBadge = (status: MaintenanceIssue['status']) => {
    const statusConfig = {
      pending: { variant: 'secondary', label: t('issueStatus.pending') },
      in_progress: { variant: 'default', label: t('issueStatus.inProgress') },
      resolved: { variant: 'outline', label: t('issueStatus.resolved') },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getIssuePriorityBadge = (priority: MaintenanceIssue['priority']) => {
    const priorityConfig = {
      low: { variant: 'outline', label: t('priority.low') },
      medium: { variant: 'default', label: t('priority.medium') },
      high: { variant: 'destructive', label: t('priority.high') },
    };

    const config = priorityConfig[priority];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const handleCreateWarehouse = () => {
    setCreateWarehouseDialogOpen(false);
    // Simuler la création d'un entrepôt
    console.log("Création d'un nouvel entrepôt");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Select value={selectedWarehouse || ''} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t('selectWarehouse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('allWarehouses')}</SelectItem>
              {warehouses.map(warehouse => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={createWarehouseDialogOpen} onOpenChange={setCreateWarehouseDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('createWarehouse')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createWarehouse')}</DialogTitle>
              <DialogDescription>{t('createWarehouseDescription')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right">
                  {t('warehouseName')}
                </label>
                <Input id="name" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="address" className="text-right">
                  {t('address')}
                </label>
                <Input id="address" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="city" className="text-right">
                  {t('city')}
                </label>
                <Input id="city" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="totalBoxes" className="text-right">
                  {t('totalBoxes')}
                </label>
                <Input id="totalBoxes" type="number" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateWarehouseDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleCreateWarehouse}>{t('create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
          <TabsTrigger value="overview">
            <Warehouse className="h-4 w-4 mr-2" />
            {t('overview')}
          </TabsTrigger>
          <TabsTrigger value="boxes">
            <Box className="h-4 w-4 mr-2" />
            {t('boxes')}
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Settings className="h-4 w-4 mr-2" />
            {t('maintenance')}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Activity className="h-4 w-4 mr-2" />
            {t('analytics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('totalWarehouses')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.totalWarehouses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('totalBoxes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.totalBoxes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('occupancyRate')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{globalStats.occupancyRate}%</div>
                  <Progress value={globalStats.occupancyRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('maintenanceIssues')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.maintenanceIssues}</div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des entrepôts */}
          <Card>
            <CardHeader>
              <CardTitle>{t('warehousesList')}</CardTitle>
              <CardDescription>{t('warehousesListDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('warehouseName')}</TableHead>
                      <TableHead>{t('location')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('boxesCount')}</TableHead>
                      <TableHead>{t('occupancyRate')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map(warehouse => (
                      <TableRow key={warehouse.id}>
                        <TableCell className="font-medium">{warehouse.name}</TableCell>
                        <TableCell>{warehouse.city}</TableCell>
                        <TableCell>{getWarehouseStatusBadge(warehouse.status)}</TableCell>
                        <TableCell>
                          {warehouse.availableBoxes} / {warehouse.totalBoxes}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{warehouse.occupancyRate}%</span>
                            <Progress value={warehouse.occupancyRate} className="h-2 w-20" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              {t('manage')}
                            </Button>
                            <Button variant="ghost" size="sm">
                              {t('viewBoxes')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boxes" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('boxesList')}</CardTitle>
              <CardDescription>{t('boxesListDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedWarehouse ? (
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {warehouses.find(w => w.id === selectedWarehouse)?.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {warehouses
                      .find(w => w.id === selectedWarehouse)
                      ?.boxes.map(box => (
                        <Card key={box.id} className="overflow-hidden">
                          <CardHeader className="p-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-sm font-medium">{box.name}</CardTitle>
                              <Badge variant="outline">{box.size}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{t('status')}</span>
                                {getBoxStatusBadge(box.status)}
                              </div>
                              {box.clientName && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{t('client')}</span>
                                  <span>{box.clientName}</span>
                                </div>
                              )}
                              {box.occupiedUntil && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{t('until')}</span>
                                  <span>{formatDate(box.occupiedUntil)}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="p-2 bg-muted/50">
                            <Button variant="ghost" size="sm" className="w-full text-xs h-8">
                              {t('manage')}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">{t('selectWarehousePrompt')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    {t('selectWarehousePromptDescription')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('maintenanceIssues')}</CardTitle>
              <CardDescription>{t('maintenanceIssuesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">{t('noMaintenanceIssues')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    {t('noMaintenanceIssuesDescription')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('warehouse')}</TableHead>
                      <TableHead>{t('box')}</TableHead>
                      <TableHead>{t('issue')}</TableHead>
                      <TableHead>{t('priority')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('reportedAt')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map(issue => (
                      <TableRow key={issue.id}>
                        <TableCell>{issue.warehouseName}</TableCell>
                        <TableCell>{issue.boxName || t('entireWarehouse')}</TableCell>
                        <TableCell>{issue.description}</TableCell>
                        <TableCell>{getIssuePriorityBadge(issue.priority)}</TableCell>
                        <TableCell>{getIssueStatusBadge(issue.status)}</TableCell>
                        <TableCell>{formatDate(issue.reportedAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            {issue.status === 'resolved' ? t('viewDetails') : t('updateStatus')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('occupancyAnalytics')}</CardTitle>
              <CardDescription>{t('occupancyAnalyticsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">{t('analyticsComingSoon')}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('seasonalOccupancy')}</CardTitle>
                <CardDescription>{t('seasonalOccupancyDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-60">
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">{t('analyticsComingSoon')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('revenueByWarehouse')}</CardTitle>
                <CardDescription>{t('revenueByWarehouseDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="h-60">
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">{t('analyticsComingSoon')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
