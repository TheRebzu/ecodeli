"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Booking {
  id: string;
  service: string;
  client: string;
  date: Date | string;
  status: "confirmed" | "pending" | "cancelled" | "completed";
}

export function BookingList({ bookings = [] }: { bookings?: Booking[] }) {
  // This is a placeholder component
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>{booking.id.substring(0, 8)}...</TableCell>
              <TableCell>{booking.service}</TableCell>
              <TableCell>{booking.client}</TableCell>
              <TableCell>
                {new Date(booking.date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {booking.status === "confirmed"
                  ? "🟢 Confirmed"
                  : booking.status === "pending"
                    ? "🟠 Pending"
                    : booking.status === "completed"
                      ? "✅ Completed"
                      : "🔴 Cancelled"}
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              No bookings yet
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
