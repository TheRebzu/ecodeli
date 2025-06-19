"use client";

// Direct imports instead of dynamic imports for better performance
export { BoxReservations as DynamicBoxReservations } from "./box-reservations";
export { BoxSearchPanel as DynamicBoxSearchPanel } from "./box-search-panel";
export { BoxNotificationsPanel as DynamicBoxNotificationsPanel } from "./box-notifications-panel";

// Direct import for usage history component  
import { BoxUsageHistory } from "./box-usage-history";
export { BoxUsageHistory as DynamicBoxUsageHistory };

// Interfaces for component props
import { BoxUsageHistoryRecord } from "@/types/warehouses/storage-box";

interface BoxUsageHistoryProps {
  history: BoxUsageHistoryRecord[];
}

export function ClientBoxUsageHistory({ history }: BoxUsageHistoryProps) {
  return <BoxUsageHistory history={history} />;
}
