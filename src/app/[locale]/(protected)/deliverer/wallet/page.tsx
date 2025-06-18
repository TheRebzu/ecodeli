"use client";

import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import DelivererWalletDashboard from "@/components/deliverer/wallet/deliverer-wallet-dashboard";

export default function DelivererWalletPage() {
  useRoleProtection(["DELIVERER"]);

  return <DelivererWalletDashboard />;
}
