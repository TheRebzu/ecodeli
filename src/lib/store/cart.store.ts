import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  type: "delivery" | "subscription" | "insurance" | "storage";
  name: string;
  description?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  options?: Record<string, any>;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  
  // Calculate values
  itemCount: () => number;
  totalPrice: () => number;
  
  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (isOpen: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      // Calculate total item count
      itemCount: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },
      
      // Calculate total price
      totalPrice: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
      
      // Add an item to the cart
      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find((i) => i.id === item.id);
        
        if (existingItem) {
          // If item exists, increase quantity
          set({
            items: items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          // Add new item with quantity 1
          set({
            items: [...items, { ...item, quantity: 1 }],
          });
        }
        
        // Open cart when adding items
        set({ isOpen: true });
      },
      
      // Remove an item from the cart
      removeItem: (id) => {
        const { items } = get();
        set({
          items: items.filter((i) => i.id !== id),
        });
      },
      
      // Update item quantity
      updateQuantity: (id, quantity) => {
        const { items } = get();
        
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          set({
            items: items.filter((i) => i.id !== id),
          });
        } else {
          // Update quantity
          set({
            items: items.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          });
        }
      },
      
      // Clear all items from cart
      clearCart: () => {
        set({
          items: [],
        });
      },
      
      // Toggle cart open/closed
      toggleCart: () => {
        const { isOpen } = get();
        set({
          isOpen: !isOpen,
        });
      },
      
      // Set cart open state
      setCartOpen: (isOpen) => {
        set({ isOpen });
      },
    }),
    {
      name: "ecodeli-cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
); 