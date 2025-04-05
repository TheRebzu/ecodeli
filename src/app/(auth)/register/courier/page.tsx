import { Metadata } from "next";
import { CourierRegisterForm } from "@/components/auth/courier-register-form";

export const metadata: Metadata = {
  title: "Inscription Livreur | EcoDeli",
  description: "Inscrivez-vous en tant que livreur pour livrer des produits à nos clients en utilisant des modes de transport écologiques",
};

export default function CourierRegisterPage() {
  return (
    <div className="w-full h-full">
      <CourierRegisterForm className="w-full h-full" />
    </div>
  );
} 