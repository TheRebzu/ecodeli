import { Metadata } from "next";
import RoleSelector from "@/components/auth/role-selector";

export const metadata: Metadata = {
  title: "Inscription | EcoDeli",
  description: "Rejoignez la communauté EcoDeli et profitez de nos services de livraison collaborative.",
};

export default function RegisterPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-4xl mx-auto">
        <RoleSelector />
      </div>
    </div>
  );
} 