"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Loader2
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface AnalyticsData {
  sales: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    averageOrderValue: number;
    conversionRate: number;
    topProducts: Array<{
      name: string;
      revenue: number;
      orders: number;
    }>;
  };
  customers: {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    customerLifetimeValue: number;
    topCustomers: Array<{
      name: string;
      totalSpent: number;
      orders: number;
    }>;
  };
  deliveries: {
    totalDeliveries: number;
    completedDeliveries: number;
    averageDeliveryTime: number;
    deliverySuccessRate: number;
    deliveryZones: Array<{
      zone: string;
      deliveries: number;
      revenue: number;
    }>;
  };
  performance: {
    ordersPerDay: number;
    revenuePerDay: number;
    customerSatisfaction: number;
    returnRate: number;
  };
}

export function MerchantAnalyticsDashboard() {
  const t = useTranslations("merchant.analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/merchant/analytics?timeRange=${timeRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        toast.error("Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Error loading analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Business Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.sales.totalRevenue.toFixed(2)}€</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {data.sales.revenueGrowth > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  {Math.abs(data.sales.revenueGrowth)}% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.deliveries.totalDeliveries}</div>
                <p className="text-xs text-muted-foreground">
                  {data.deliveries.completedDeliveries} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customers.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  {data.customers.newCustomers} new this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.sales.conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Avg order: {data.sales.averageOrderValue.toFixed(2)}€
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Best selling items by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.sales.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{product.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {product.orders} orders
                        </span>
                        <Badge variant="secondary">{product.revenue.toFixed(2)}€</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Most valuable customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.customers.topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{customer.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {customer.orders} orders
                        </span>
                        <Badge variant="secondary">{customer.totalSpent.toFixed(2)}€</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Sales performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span className="font-semibold">{data.sales.totalRevenue.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Revenue</span>
                  <span className="font-semibold">{data.sales.monthlyRevenue.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Revenue Growth</span>
                  <span className={`font-semibold ${data.sales.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.sales.revenueGrowth > 0 ? '+' : ''}{data.sales.revenueGrowth}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Order Value</span>
                  <span className="font-semibold">{data.sales.averageOrderValue.toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Metrics</CardTitle>
                <CardDescription>Customer conversion analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Conversion Rate</span>
                  <span className="font-semibold">{data.sales.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer LTV</span>
                  <span className="font-semibold">{data.customers.customerLifetimeValue.toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.sales.topProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{product.name}</span>
                      <Badge variant="outline">{product.revenue.toFixed(2)}€</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Overview</CardTitle>
                <CardDescription>Customer metrics and insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Customers</span>
                  <span className="font-semibold">{data.customers.totalCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span>New Customers</span>
                  <span className="font-semibold text-green-600">+{data.customers.newCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Repeat Customers</span>
                  <span className="font-semibold">{data.customers.repeatCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer LTV</span>
                  <span className="font-semibold">{data.customers.customerLifetimeValue.toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Most valuable customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.customers.topCustomers.map((customer, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.orders} orders</div>
                      </div>
                      <Badge variant="secondary">{customer.totalSpent.toFixed(2)}€</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Behavioral analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {((data.customers.repeatCustomers / data.customers.totalCustomers) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Retention Rate</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
                <CardDescription>Delivery metrics and success rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Deliveries</span>
                  <span className="font-semibold">{data.deliveries.totalDeliveries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="font-semibold text-green-600">{data.deliveries.completedDeliveries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="font-semibold">{data.deliveries.deliverySuccessRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Delivery Time</span>
                  <span className="font-semibold">{data.deliveries.averageDeliveryTime.toFixed(1)}h</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Zones</CardTitle>
                <CardDescription>Performance by delivery area</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.deliveries.deliveryZones.map((zone, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{zone.zone}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">{zone.deliveries} deliveries</span>
                        <Badge variant="outline">{zone.revenue.toFixed(2)}€</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Insights</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.deliveries.deliverySuccessRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {data.deliveries.averageDeliveryTime.toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Delivery Time</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Orders</CardTitle>
                <CardDescription>Average orders per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.performance.ordersPerDay}</div>
                <p className="text-xs text-muted-foreground">orders/day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Average revenue per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.performance.revenuePerDay.toFixed(2)}€</div>
                <p className="text-xs text-muted-foreground">revenue/day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
                <CardDescription>Average rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.performance.customerSatisfaction.toFixed(1)}/5</div>
                <p className="text-xs text-muted-foreground">stars</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Return Rate</CardTitle>
                <CardDescription>Product return percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.performance.returnRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">returns</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 