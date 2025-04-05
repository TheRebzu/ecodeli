'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientData } from '@/lib/seed-client';
import { ApiClient } from '@/lib/api-client';

// Types
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  imageUrl: string;
};

type Order = {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  paymentMethod: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Fetch orders when component mounts
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const data = await clientData.fetchOrders();
        if (data && Array.isArray(data)) {
          setOrders(data as Order[]);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        toast.error('Could not load your orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Check if status is one of the allowed values
  const isValidStatus = (status: string): status is OrderStatus => {
    return ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status);
  }

  // Filter orders based on tab selection and search term
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    return order.status === activeTab && matchesSearch;
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // View order details
  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Get status badge color
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Track order
  const trackOrder = async (trackingNumber: string | undefined) => {
    if (!trackingNumber) {
      toast.error('No tracking number available');
      return;
    }

    try {
      const response = await ApiClient.get(`/api/orders/track/${trackingNumber}`);
      
      if (response.success && response.data) {
        toast.success('Tracking information retrieved');
        // Here you could open a modal with tracking details
      } else {
        toast.error('Failed to retrieve tracking information');
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error('Failed to track order');
    }
  };

  // Download invoice
  const downloadInvoice = async (orderId: string) => {
    try {
      const response = await ApiClient.get(`/api/orders/${orderId}/invoice`);
      
      if (response.success && response.data) {
        // Type assertion for the response data
        const data = response.data as { invoiceUrl: string };
        if (data.invoiceUrl) {
          // Open the invoice in a new tab
          window.open(data.invoiceUrl, '_blank');
        } else {
          toast.error('No invoice URL available');
        }
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await ApiClient.post(`/api/orders/${orderId}/cancel`, {});
      
      if (response.success) {
        toast.success('Order cancelled successfully');
        
        // Update orders list with the cancelled order
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' as OrderStatus } 
            : order
        ));
        
        // Update selected order if it's the one being cancelled
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
        }
      } else {
        toast.error('Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  // Request refund
  const requestRefund = async (orderId: string) => {
    if (!confirm('Are you sure you want to request a refund for this order?')) {
      return;
    }

    try {
      const response = await ApiClient.post(`/api/orders/${orderId}/refund`, {
        reason: 'Customer request'
      });
      
      if (response.success) {
        toast.success('Refund requested successfully');
        
        // Update orders list with the refunded order
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'refunded' as OrderStatus } 
            : order
        ));
        
        // Update selected order if it's the one being refunded
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: 'refunded' });
        }
      } else {
        toast.error('Failed to request refund');
      }
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast.error('Failed to request refund');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-0">
                  <div className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                      <CardDescription>{formatDate(order.date)}</CardDescription>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'} · {formatCurrency(order.total)}
                      </div>
                      <div className="hidden sm:flex items-center space-x-2">
                        {order.items.slice(0, 3).map((item) => (
                          <img 
                            key={item.id}
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-10 h-10 object-cover rounded border"
                          />
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{order.items.length - 3} more</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewOrderDetails(order)}
                      >
                        View Details
                      </Button>
                      
                      {order.status === 'shipped' && (
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => trackOrder(order.trackingNumber)}
                        >
                          Track Order
                        </Button>
                      )}
                      
                      {['delivered', 'shipped'].includes(order.status) && (
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadInvoice(order.id)}
                        >
                          Download Invoice
                        </Button>
                      )}
                      
                      {order.status === 'pending' && (
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelOrder(order.id)}
                        >
                          Cancel Order
                        </Button>
                      )}
                      
                      {['delivered', 'shipped'].includes(order.status) && (
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => requestRefund(order.id)}
                        >
                          Request Refund
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Tabs>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Order #{selectedOrder.orderNumber}</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowOrderDetails(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              <div className="flex justify-between mb-6">
                <div>
                  <div className="text-sm text-muted-foreground">Order Date</div>
                  <div>{formatDate(selectedOrder.date)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="font-semibold">{formatCurrency(selectedOrder.total)}</div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-2 border-b">
                      <img 
                        src={item.imageUrl} 
                        alt={item.productName} 
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × {formatCurrency(item.price)}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Shipping Address</h3>
                  <div className="text-sm">
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.postalCode}</p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Payment Information</h3>
                  <div className="text-sm">
                    <p>Method: {selectedOrder.paymentMethod}</p>
                    {selectedOrder.trackingNumber && (
                      <p className="mt-2">Tracking Number: {selectedOrder.trackingNumber}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                >
                  Close
                </Button>
                
                {selectedOrder.status === 'shipped' && (
                  <Button
                    variant="outline"
                    onClick={() => trackOrder(selectedOrder.trackingNumber)}
                  >
                    Track Order
                  </Button>
                )}
                
                {['delivered', 'shipped'].includes(selectedOrder.status) && (
                  <Button
                    variant="outline"
                    onClick={() => downloadInvoice(selectedOrder.id)}
                  >
                    Download Invoice
                  </Button>
                )}
                
                {selectedOrder.status === 'pending' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      cancelOrder(selectedOrder.id);
                      setShowOrderDetails(false);
                    }}
                  >
                    Cancel Order
                  </Button>
                )}
                
                {['delivered', 'shipped'].includes(selectedOrder.status) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      requestRefund(selectedOrder.id);
                      setShowOrderDetails(false);
                    }}
                  >
                    Request Refund
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 