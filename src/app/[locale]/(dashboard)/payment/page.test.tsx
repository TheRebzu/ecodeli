import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentPage from '@/app/[locale]/(dashboard)/payment/page';
import { api } from '@/trpc/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: vi.fn(),
}));

vi.mock('@/trpc/react', () => ({
  api: {
    order: {
      getOrderById: {
        useQuery: vi.fn(),
      },
    },
    payment: {
      createCheckoutSession: {
        useMutation: vi.fn(),
      },
    },
  },
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    redirectToCheckout: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('@/components/dashboard/dashboard-layout', () => ({
  DashboardLayout: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/dashboard/client/client-sidebar', () => ({
  ClientSidebar: () => <div data-testid="client-sidebar" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }) => (
    <button data-testid="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock translations
    useTranslations.mockReturnValue((key) => key);
    
    // Mock router
    useRouter.mockReturnValue({
      push: vi.fn(),
      back: vi.fn(),
    });
    
    // Mock search params
    useSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('order_123'),
    });
  });
  
  it('should render loading state initially', () => {
    // Mock loading state
    api.order.getOrderById.useQuery.mockReturnValue({
      isLoading: true,
      data: null,
      error: null,
    });
    
    api.payment.createCheckoutSession.useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });
    
    render(<PaymentPage />);
    
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
  });
  
  it('should render order details when loaded', () => {
    // Mock order data
    const mockOrder = {
      id: 'order_123',
      orderNumber: 'ECO-123',
      createdAt: new Date().toISOString(),
      totalAmount: 25.00,
      shippingFee: 3.00,
      tax: 2.00,
      paymentStatus: 'PENDING',
      store: {
        name: 'Test Store',
      },
      orderItems: [
        { id: 'item_1', quantity: 1 },
        { id: 'item_2', quantity: 1 },
      ],
    };
    
    api.order.getOrderById.useQuery.mockReturnValue({
      isLoading: false,
      data: mockOrder,
      error: null,
    });
    
    api.payment.createCheckoutSession.useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });
    
    render(<PaymentPage />);
    
    expect(screen.getByText('orderSummary')).toBeInTheDocument();
    expect(screen.getByText('paymentMethod')).toBeInTheDocument();
  });
  
  it('should handle payment button click', async () => {
    // Mock order data
    const mockOrder = {
      id: 'order_123',
      orderNumber: 'ECO-123',
      createdAt: new Date().toISOString(),
      totalAmount: 25.00,
      shippingFee: 3.00,
      tax: 2.00,
      paymentStatus: 'PENDING',
      store: {
        name: 'Test Store',
      },
      orderItems: [
        { id: 'item_1', quantity: 1 },
        { id: 'item_2', quantity: 1 },
      ],
    };
    
    const mutateMock = vi.fn();
    
    api.order.getOrderById.useQuery.mockReturnValue({
      isLoading: false,
      data: mockOrder,
      error: null,
    });
    
    api.payment.createCheckoutSession.useMutation.mockReturnValue({
      mutate: mutateMock,
      isLoading: false,
    });
    
    render(<PaymentPage />);
    
    // Find and click the payment button
    const payButton = screen.getByText('payNow');
    fireEvent.click(payButton);
    
    // Check if mutation was called with correct order ID
    expect(mutateMock).toHaveBeenCalledWith({ orderId: 'order_123' });
  });
  
  it('should handle error state', () => {
    // Mock error state
    api.order.getOrderById.useQuery.mockReturnValue({
      isLoading: false,
      data: null,
      error: new Error('Order not found'),
    });
    
    render(<PaymentPage />);
    
    expect(screen.getByText('orderNotFound')).toBeInTheDocument();
  });
});
