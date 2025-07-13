import { useTranslations } from "next-intl";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🌱 EcoDeli</h1>
          <p className="text-gray-600">Livraison écologique et collaborative</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
