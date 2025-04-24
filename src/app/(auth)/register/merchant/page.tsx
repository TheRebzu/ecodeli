import { Metadata } from "next";
import MerchantRegistrationForm from "@/components/auth/register-forms/merchant-form";

export const metadata: Metadata = {
  title: "Inscription Commerçant | EcoDeli",
  description: "Inscrivez votre commerce sur EcoDeli et proposez des livraisons à vos clients.",
};

export default function MerchantRegistrationPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <MerchantRegistrationForm />
    </div>
  );
} 