import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import MerchantInvoices from '@/app/merchant/invoices/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('MerchantInvoices Component', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the invoices page correctly', () => {
    render(<MerchantInvoices />);

    // Check if the title is rendered
    expect(screen.getByText('Gestion des factures')).toBeInTheDocument();

    // Check if the tabs are rendered
    expect(screen.getByRole('tab', { name: 'Toutes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Payées' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'En attente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'En retard' })).toBeInTheDocument();

    // Check if the search input is rendered
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument();

    // Check if the "Exporter" button is rendered
    expect(screen.getByText('Exporter')).toBeInTheDocument();
  });

  it('navigates to export page when button is clicked', () => {
    render(<MerchantInvoices />);

    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/merchant/invoices/export');
  });

  it('filters invoices when searching', () => {
    render(<MerchantInvoices />);

    // Get all invoice rows initially
    const initialInvoiceRows = screen.getAllByRole('row');
    const initialCount = initialInvoiceRows.length - 1; // Subtract header row

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Rechercher...');
    fireEvent.change(searchInput, { target: { value: 'Abonnement' } });

    // Check if invoices are filtered
    const filteredInvoiceRows = screen.getAllByRole('row');
    expect(filteredInvoiceRows.length - 1).toBeLessThan(initialCount);
  });

  it('displays invoice status badges with correct variants', () => {
    render(<MerchantInvoices />);

    // Check if status badges are rendered with correct text
    expect(screen.getByText('Payée')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
    expect(screen.getByText('En retard')).toBeInTheDocument();
  });

  it('navigates to invoice details when viewing an invoice', () => {
    render(<MerchantInvoices />);

    // Find the first view button and click it
    const viewButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(viewButtons[0]);

    // Check if router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalled();
  });
});
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  serverExternalPackages: ['@prisma/client'],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  distDir: process.env.BUILD_DIR || '.next',
};

export default nextConfig;
{
  "name": "ecodeli",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "ts-node --compiler-options \"{\\\"module\\\":\\\"CommonJS\\\"}\" prisma/seed.ts",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@auth/core": "^0.38.0",
    "@auth/prisma-adapter": "^2.8.0",
    "@hookform/resolvers": "^4.1.3",
    "@prisma/client": "^6.5.0",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-navigation-menu": "^1.2.5",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@react-email/components": "^0.0.35",
    "@tanstack/react-table": "^8.21.2",
    "@types/bcryptjs": "^3.0.0",
    "@types/canvas-confetti": "^1.9.0",
    "bcrypt": "5.1.1",
    "bcryptjs": "^3.0.2",
    "canvas-confetti": "^1.9.3",
    "chart.js": "^4.4.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.5.0",
    "lucide-react": "^0.483.0",
    "motion": "^12.5.0",
    "next": "^15.2.3",
    "next-auth": "^4.24.11",
    "next-intl": "^4.0.2",
    "next-safe-action": "^7.10.4",
    "next-swagger-doc": "^0.4.1",
    "next-themes": "^0.4.6",
    "next-zod-router": "^0.0.46",
    "nuqs": "^2.4.1",
    "otplib": "^12.0.1",
    "preact": "^10.26.4",
    "preact-render-to-string": "^6.5.13",
    "qrcode": "^1.5.4",
    "react": "^18.2.0",
    "react-calendar": "^5.1.0",
    "react-chartjs-2": "^5.3.0",
    "react-day-picker": "^9.6.3",
    "react-dom": "^18.2.0",
    "react-email": "^3.0.7",
    "react-hook-form": "^7.54.2",
    "recharts": "^2.15.1",
    "resend": "^4.1.2",
    "stripe": "^17.7.0",
    "tailwind-merge": "^3.0.2",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@babel/core": "^7.26.10",
    "@babel/plugin-syntax-import-attributes": "^7.26.0",
    "@babel/plugin-transform-typescript": "^7.27.0",
    "@babel/preset-env": "^7.26.9",
    "@babel/preset-react": "^7.26.3",
    "@babel/preset-typescript": "^7.27.0",
    "@faker-js/faker": "^9.6.0",
    "@jest/globals": "^29.7.0",
    "@tailwindcss/postcss": "^4.0.17",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^14.2.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/bcrypt": "^5.0.2",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^22.13.11",
    "@types/react": "^19.0.12",
    "@types/react-dom": "^19.0.4",
    "autoprefixer": "^10.4.18",
    "eslint": "^9.23.0",
    "eslint-config-next": "^15.2.3",
    "postcss": "^8.4.35",
    "prisma": "^6.5.0",
    "tailwindcss": "^3.4.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.2"
  }
}
