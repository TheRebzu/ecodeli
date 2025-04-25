"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Delivery {
  id: string;
  from: string;
  to: string;
  distance: string;
  payment: number;
  status: string;
}

export function DeliveryList({ deliveries = [] }: { deliveries?: Delivery[] }) {
  // This is a placeholder component
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Distance</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell>{delivery.id.substring(0, 8)}...</TableCell>
              <TableCell>{delivery.from}</TableCell>
              <TableCell>{delivery.to}</TableCell>
              <TableCell>{delivery.distance}</TableCell>
              <TableCell>{delivery.payment.toFixed(2)} €</TableCell>
              <TableCell>
                <Button variant="outline" size="sm">
                  Accept
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              No deliveries available at this time
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
