import { ProviderRegisterForm } from '@/components/auth/register-forms/provider-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription Prestataire | EcoDeli',
  description: 'Inscrivez-vous en tant que prestataire de service sur EcoDeli',
};

export default function ProviderRegisterPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <ProviderRegisterForm />
    </div>
  );
}
