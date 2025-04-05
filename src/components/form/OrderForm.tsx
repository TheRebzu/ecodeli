"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/use-products";
import { useOrders } from "@/hooks/use-orders";
import { Order, OrderCreateDTO, OrderItem, ShippingAddress } from "@/lib/services/order.service";
import { Product } from "@/lib/services/product.service";
import { toast } from "sonner";

type OrderFormProps = {
  order?: Order;
  onComplete?: () => void;
  onCancel?: () => void;
};

export function OrderForm({ order, onComplete, onCancel }: OrderFormProps) {
  const { products, fetchProducts, loading: productsLoading } = useProducts();
  const { createOrder, updateOrder, loading } = useOrders();

  const [formData, setFormData] = useState<OrderCreateDTO>({
    shippingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "France",
    },
    items: [],
    paymentMethod: "CREDIT_CARD",
    notes: "",
  });

  const [selectedProducts, setSelectedProducts] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load products and initialize form if editing an existing order
  useEffect(() => {
    fetchProducts({ limit: 100 });

    if (order) {
      setFormData({
        shippingAddress: order.shippingAddress,
        items: order.items,
        paymentMethod: order.paymentMethod,
        notes: order.notes || "",
      });

      // Initialize selected products if we have an order
      if (products?.length) {
        const selected = order.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return { product: product!, quantity: item.quantity };
        }).filter(item => item.product); // Filter out any products that no longer exist
        
        setSelectedProducts(selected);
      }
    }
  }, [fetchProducts, order, products]);

  // Calculate order summary
  const calculateOrderSummary = () => {
    const subtotal = selectedProducts.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    const shipping = subtotal > 50 ? 0 : 5.99;
    const tax = subtotal * 0.2; // 20% VAT
    const total = subtotal + shipping + tax;
    
    return { subtotal, shipping, tax, total };
  };

  const handleProductAdd = () => {
    setSelectedProducts([...selectedProducts, { product: products![0], quantity: 1 }]);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const newSelectedProducts = [...selectedProducts];
    newSelectedProducts[index].product = product;
    setSelectedProducts(newSelectedProducts);
    
    updateOrderItems();
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const newSelectedProducts = [...selectedProducts];
    newSelectedProducts[index].quantity = quantity;
    setSelectedProducts(newSelectedProducts);
    
    updateOrderItems();
  };

  const handleProductRemove = (index: number) => {
    const newSelectedProducts = [...selectedProducts];
    newSelectedProducts.splice(index, 1);
    setSelectedProducts(newSelectedProducts);
    
    updateOrderItems();
  };

  const updateOrderItems = () => {
    const items: OrderItem[] = selectedProducts.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      imageUrl: item.product.imageUrl || ""
    }));
    
    setFormData(prev => ({ ...prev, items }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith("shipping.")) {
      const field = name.split(".")[1] as keyof ShippingAddress;
      setFormData(prev => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate shipping address
    if (!formData.shippingAddress.street) errors["shipping.street"] = "L'adresse est requise";
    if (!formData.shippingAddress.city) errors["shipping.city"] = "La ville est requise";
    if (!formData.shippingAddress.zipCode) errors["shipping.zipCode"] = "Le code postal est requis";
    
    // Validate items
    if (selectedProducts.length === 0) errors["items"] = "Veuillez ajouter au moins un produit";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs du formulaire");
      return;
    }
    
    try {
      if (order) {
        // Update existing order
        await updateOrder(order.id, formData);
        toast.success("Commande mise à jour avec succès");
      } else {
        // Create new order
        await createOrder(formData);
        toast.success("Commande créée avec succès");
      }
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Erreur lors de l'enregistrement de la commande");
    }
  };

  const summary = calculateOrderSummary();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">
        {order ? "Modifier la commande" : "Nouvelle commande"}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Shipping Information */}
          <div>
            <h3 className="font-medium mb-4 pb-2 border-b">Adresse de livraison</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="shipping.street" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  id="shipping.street"
                  name="shipping.street"
                  value={formData.shippingAddress.street}
                  onChange={handleInputChange}
                  className={`w-full rounded-md border ${validationErrors["shipping.street"] ? "border-red-500" : "border-gray-300"} px-3 py-2`}
                />
                {validationErrors["shipping.street"] && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors["shipping.street"]}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shipping.city" className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    id="shipping.city"
                    name="shipping.city"
                    value={formData.shippingAddress.city}
                    onChange={handleInputChange}
                    className={`w-full rounded-md border ${validationErrors["shipping.city"] ? "border-red-500" : "border-gray-300"} px-3 py-2`}
                  />
                  {validationErrors["shipping.city"] && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors["shipping.city"]}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="shipping.zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal
                  </label>
                  <input
                    type="text"
                    id="shipping.zipCode"
                    name="shipping.zipCode"
                    value={formData.shippingAddress.zipCode}
                    onChange={handleInputChange}
                    className={`w-full rounded-md border ${validationErrors["shipping.zipCode"] ? "border-red-500" : "border-gray-300"} px-3 py-2`}
                  />
                  {validationErrors["shipping.zipCode"] && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors["shipping.zipCode"]}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shipping.state" className="block text-sm font-medium text-gray-700 mb-1">
                    Région/État
                  </label>
                  <input
                    type="text"
                    id="shipping.state"
                    name="shipping.state"
                    value={formData.shippingAddress.state}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                
                <div>
                  <label htmlFor="shipping.country" className="block text-sm font-medium text-gray-700 mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    id="shipping.country"
                    name="shipping.country"
                    value={formData.shippingAddress.country}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Mode de paiement
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="CREDIT_CARD">Carte de crédit</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="BANK_TRANSFER">Virement bancaire</option>
                  <option value="CASH_ON_DELIVERY">Paiement à la livraison</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Instructions spéciales pour la livraison..."
                />
              </div>
            </div>
          </div>
          
          {/* Order Items */}
          <div>
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="font-medium">Produits</h3>
              <button
                type="button"
                onClick={handleProductAdd}
                disabled={!products?.length || productsLoading}
                className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark disabled:opacity-50"
              >
                Ajouter un produit
              </button>
            </div>
            
            {validationErrors["items"] && (
              <p className="mb-4 text-sm text-red-500">{validationErrors["items"]}</p>
            )}
            
            {productsLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {selectedProducts.length > 0 ? (
                  selectedProducts.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-3 border rounded-md">
                      <div className="flex-grow">
                        <select
                          value={item.product.id}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 mb-2"
                        >
                          {products?.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {product.price.toFixed(2)} €
                            </option>
                          ))}
                        </select>
                        
                        <div className="flex items-center">
                          <label htmlFor={`quantity-${index}`} className="text-sm mr-2">
                            Quantité:
                          </label>
                          <input
                            type="number"
                            id={`quantity-${index}`}
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1"
                          />
                          
                          <span className="ml-auto text-sm font-medium">
                            {(item.product.price * item.quantity).toFixed(2)} €
                          </span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleProductRemove(index)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove product"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Aucun produit ajouté
                  </div>
                )}
              </div>
            )}
            
            {/* Order Summary */}
            <div className="mt-6 bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium mb-3">Récapitulatif</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sous-total:</span>
                  <span>{summary.subtotal.toFixed(2)} €</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Frais d'expédition:</span>
                  <span>{summary.shipping.toFixed(2)} €</span>
                </div>
                
                <div className="flex justify-between">
                  <span>TVA (20%):</span>
                  <span>{summary.tax.toFixed(2)} €</span>
                </div>
                
                <div className="border-t pt-2 mt-2 font-medium flex justify-between">
                  <span>Total:</span>
                  <span>{summary.total.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
          >
            {loading && (
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
            )}
            {order ? "Mettre à jour" : "Créer la commande"}
          </button>
        </div>
      </form>
    </div>
  );
} 