import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import ContractManagement from '@/features/merchant/components/contract-management';

export default async function MerchantContractsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'MERCHANT') {
    redirect('/login');
  }

  const merchant = await db.merchant.findFirst({
    where: { userId: session.user.id }
  });

  if (!merchant) {
    redirect('/merchant');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Gestion du contrat</h1>
        <p className="text-gray-600">
          Consultez et gérez votre contrat avec EcoDeli
        </p>
      </div>

      <ContractManagement merchantId={merchant.id} />
    </div>
  );
}