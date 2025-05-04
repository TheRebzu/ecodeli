import { Metadata } from 'next';
import { DocumentUpload } from '@/components/documents/document-upload';
import DocumentList from '@/components/documents/document-list';

export const metadata: Metadata = {
  title: 'Mes documents | EcoDeli Prestataire',
  description: 'Gérez vos documents et certifications',
};

export default function ProviderDocumentsPage() {
  return (
    <div className="container py-6 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Mes documents</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <DocumentUpload userRole="PROVIDER" />
        </div>

        <div>
          <DocumentList />
        </div>
      </div>
    </div>
  );
}
