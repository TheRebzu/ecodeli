import { Metadata } from "next";
import MerchantRegistrationForm from "@/components/auth/register-forms/merchant-form";

export const metadata: Metadata = {
  title: "Inscription Commerçant | EcoDeli",
  description:
    "Inscrivez votre commerce sur EcoDeli et proposez des livraisons à vos clients.",
};

export default function MerchantRegistrationPage() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <MerchantRegistrationForm />
    </div>
  );
}
