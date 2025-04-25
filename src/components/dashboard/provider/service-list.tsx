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

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  status: "active" | "draft" | "unavailable";
}

export function ServiceList({ services = [] }: { services?: Service[] }) {
  // This is a placeholder component
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length > 0 ? (
            services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.category}</TableCell>
                <TableCell>{service.price.toFixed(2)} €</TableCell>
                <TableCell>{service.duration}</TableCell>
                <TableCell>
                  {service.status === "active"
                    ? "🟢 Active"
                    : service.status === "draft"
                      ? "🟠 Draft"
                      : "🔴 Unavailable"}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No services yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="mt-4 flex justify-end">
        <Button variant="outline">Add New Service</Button>
      </div>
    </div>
  );
}
