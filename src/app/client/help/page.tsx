import { Metadata } from 'next';
import { HelpContent } from '@/components/client/help/help-content';

export const metadata: Metadata = {
  title: 'Centre d\'aide | EcoDeli',
  description: 'Retrouvez toutes les réponses à vos questions sur nos services',
};

export default function HelpPage() {
  return (
    <main className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Centre d&apos;aide</h1>
      <HelpContent />
    </main>
  );
} 