"use client";

import dynamic from "next/dynamic";
import { BoxUsageHistoryRecord } from "@/types/warehouses/storage-box";

// Imports dynamiques des composants client avec export nommés
export const DynamicBoxReservations = dynamic(
  () =>
    import("./box-reservations").then((mod) => ({
      default: mod.BoxReservations,
    })),
  { ssr: false },
);

export const DynamicBoxSearchPanel = dynamic(
  () =>
    import("./box-search-panel").then((mod) => ({
      default: mod.BoxSearchPanel,
    })),
  { ssr: false },
);

export const DynamicBoxNotificationsPanel = dynamic(
  () =>
    import("./box-notifications-panel").then((mod) => ({
      default: mod.BoxNotificationsPanel,
    })),
  { ssr: false },
);

// Pour le composant qui n'exporte pas default
export const DynamicBoxUsageHistory = dynamic(
  () =>
    import("./box-usage-history").then((mod) => ({
      default: mod.BoxUsageHistory,
    })),
  { ssr: false },
);

// Interfaces pour les props des composants dynamiques
interface BoxUsageHistoryProps {
  history: BoxUsageHistoryRecord[];
}

export function ClientBoxUsageHistory({ history }: BoxUsageHistoryProps) {
  return <DynamicBoxUsageHistory history={history} />;
}
