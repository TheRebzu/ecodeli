"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Address {
  id: string;
  name?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export function AddressCard({ address }: { address: Address }) {
  // This is a placeholder component
  return (
    <Card>
      <CardHeader>
        <CardTitle>{address.name || "Delivery Address"}</CardTitle>
        {address.isDefault && (
          <CardDescription>Default address</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p>{address.street}</p>
          <p>
            {address.postalCode} {address.city}
          </p>
          <p>{address.country}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">
          Edit
        </Button>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
