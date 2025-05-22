import { ProtectedHeader } from '@/components/layout/protected-header';
import { ProtectedFooter } from '@/components/layout/protected-footer';
import { DelivererSidebar } from '@/components/layout/sidebars/deliverer-sidebar';

interface DelivererLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export default function DelivererLayout({ children, params }: DelivererLayoutProps) {
  const { locale } = params;

  return (
    <div className="min-h-screen flex flex-col">
      <ProtectedHeader locale={locale} />

      <div className="flex-1 flex">
        <div className="hidden md:block w-64 shrink-0">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
            <DelivererSidebar locale={locale} />
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden bg-muted/10">
          <div className="container max-w-7xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>

      <ProtectedFooter locale={locale} />
    </div>
  );
}
