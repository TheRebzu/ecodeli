import MerchantInvoicesDashboard from "@/components/merchant/billing/merchant-invoices-dashboard";

interface MerchantInvoicesPageProps {
  params: {
    locale: string;
  };
}

export default function MerchantInvoicesPage({ params }: MerchantInvoicesPageProps) {
  return <MerchantInvoicesDashboard locale={params.locale} />;
}