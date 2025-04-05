"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/use-products";
import { useUsers } from "@/hooks/use-users";
import { useOrders } from "@/hooks/use-orders";
import { useDatabaseSync } from "@/hooks/use-database-sync";

type DashboardProps = {
  userId?: string;
}

export function Dashboard(props: DashboardProps) {
  const { userId } = props;
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'users' | 'sync'>('overview');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');
  
  // Initialize hooks
  const { 
    currentUser, 
    getCurrentUser,
    profileLoading
  } = useUsers();
  
  const { 
    products, 
    fetchProducts, 
    loading: productsLoading 
  } = useProducts();
  
  const { 
    orders, 
    orderStats, 
    getOrderStats, 
    getMyOrders, 
    myOrders, 
    loading: ordersLoading,
    statsLoading
  } = useOrders();
  
  const { 
    online, 
    syncStats, 
    isSyncing, 
    pendingOperations, 
    sync 
  } = useDatabaseSync();

  // Load initial data
  useEffect(() => {
    const loadDashboardData = async () => {
      // Load user profile if userId is not provided
      if (!userId) {
        await getCurrentUser();
      }
      
      // Load products
      await fetchProducts({ limit: 5 });
      
      // Load orders and stats for the current user or all orders for admins
      if (userId) {
        await getMyOrders();
      } else {
        await getOrderStats({ groupBy: timeRange });
      }
    };
    
    loadDashboardData();
  }, [fetchProducts, getCurrentUser, getMyOrders, getOrderStats, timeRange, userId]);
  
  // Handle time range change
  const handleTimeRangeChange = async (range: 'day' | 'week' | 'month') => {
    setTimeRange(range);
    await getOrderStats({ groupBy: range });
  };
  
  // Handle manual sync
  const handleManualSync = () => {
    sync();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-gray-500">
            {currentUser ? 
              `Bienvenue, ${currentUser.name}` : 
              'Chargement de votre profil...'}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center">
          <div className={`mr-3 h-3 w-3 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600 mr-6">
            {online ? 'En ligne' : 'Hors ligne'}
          </span>
          
          {pendingOperations.length > 0 && (
            <button 
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {isSyncing ? 'Synchronisation...' : `Synchroniser (${pendingOperations.length})`}
            </button>
          )}
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="mb-8 border-b">
        <ul className="flex overflow-x-auto">
          <li className="mr-1">
            <button
              className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'overview' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('overview')}
            >
              Aperçu
            </button>
          </li>
          <li className="mr-1">
            <button
              className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'products' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('products')}
            >
              Produits
            </button>
          </li>
          <li className="mr-1">
            <button
              className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('orders')}
            >
              Commandes
            </button>
          </li>
          <li className="mr-1">
            <button
              className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('users')}
            >
              Utilisateurs
            </button>
          </li>
          <li>
            <button
              className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'sync' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('sync')}
            >
              Synchronisation
            </button>
          </li>
        </ul>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Produits</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold">{products?.length || 0}</span>
              {productsLoading && (
                <div className="ml-2 animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Commandes</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold">{orderStats?.totalOrders || myOrders?.length || 0}</span>
              {(ordersLoading || statsLoading) && (
                <div className="ml-2 animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Montant total</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold">
                {orderStats?.totalAmount
                  ? `${orderStats.totalAmount.toFixed(2)} €`
                  : myOrders
                  ? `${myOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)} €`
                  : '0.00 €'}
              </span>
              {(ordersLoading || statsLoading) && (
                <div className="ml-2 animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Synchronisation</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold">{pendingOperations.length}</span>
              {isSyncing && (
                <div className="ml-2 animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Dernière synchro: {syncStats.lastSync}</p>
          </div>

          {/* Time Range Selector (for admins) */}
          {!userId && orderStats && (
            <div className="md:col-span-2 lg:col-span-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Statistiques des commandes</h3>
                  <div className="inline-flex rounded-md shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleTimeRangeChange('day')}
                      className={`px-4 py-2 text-sm font-medium rounded-l-lg ${timeRange === 'day' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      Jour
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeRangeChange('week')}
                      className={`px-4 py-2 text-sm font-medium ${timeRange === 'week' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      Semaine
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeRangeChange('month')}
                      className={`px-4 py-2 text-sm font-medium rounded-r-lg ${timeRange === 'month' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      Mois
                    </button>
                  </div>
                </div>
                
                {/* Chart would go here in a real implementation */}
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  {statsLoading ? (
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p className="mb-2">Graphique des commandes par période</p>
                      <p className="text-xs">(Implémentez un graphique ici avec Chart.js ou Recharts)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Produits récents</h2>
            <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">
              Ajouter un produit
            </button>
          </div>
          
          {productsLoading ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.category || 'Non catégorisé'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.price.toFixed(2)} €</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.isAvailable ? 'Disponible' : 'Indisponible'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-primary-dark mr-3">Modifier</button>
                        <button className="text-red-600 hover:text-red-900">Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Aucun produit trouvé
            </div>
          )}
        </div>
      )}
      
      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">
              {userId ? 'Mes commandes' : 'Commandes récentes'}
            </h2>
          </div>
          
          {ordersLoading ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commande</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(userId ? myOrders : orders)?.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">{order.items.length} articles</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                            order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.totalAmount.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-primary-dark mr-3">Détails</button>
                        <button className="text-gray-600 hover:text-gray-900">Facture</button>
                      </td>
                    </tr>
                  ))}
                  
                  {(!userId && !orders?.length) || (userId && !myOrders?.length) ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Aucune commande trouvée
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Synchronization Tab */}
      {activeTab === 'sync' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">État de la synchronisation</h2>
            <div className="flex items-center">
              <span className={`h-3 w-3 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="ml-2 text-sm text-gray-600">{online ? 'En ligne' : 'Hors ligne'}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Dernière synchronisation</h3>
                <p className="text-lg font-semibold">{syncStats.lastSync}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Opérations en attente</h3>
                <p className="text-lg font-semibold">{syncStats.pendingCount}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Erreurs</h3>
                <p className="text-lg font-semibold">{syncStats.errorCount}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleManualSync}
                disabled={isSyncing || pendingOperations.length === 0}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}
              </button>
            </div>
          </div>
          
          {pendingOperations.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Opérations en attente</h3>
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entité</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opération</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingOperations.map((op) => (
                      <tr key={op.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{op.id.substring(0, 8)}...</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{op.entity}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${op.operation === 'create' ? 'bg-green-100 text-green-800' : 
                              op.operation === 'delete' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800'}`}
                          >
                            {op.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(op.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}