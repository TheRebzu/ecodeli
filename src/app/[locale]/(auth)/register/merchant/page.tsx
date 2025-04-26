import { MerchantRegistrationForm } from "@/components/auth/register-forms/merchant-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription Commerçant | EcoDeli",
  description: "Inscrivez-vous en tant que commerçant sur EcoDeli",
};

export default function MerchantRegisterPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <MerchantRegistrationForm />
    </div>
  );
}
