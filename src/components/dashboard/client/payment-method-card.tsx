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
import { CreditCard } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  lastFourDigits?: string;
  expiryDate?: string;
  isDefault?: boolean;
}

export function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  // This is a placeholder component
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-4 w-4" />
          {method.name}
        </CardTitle>
        {method.isDefault && (
          <CardDescription>Default payment method</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-sm">{method.type}</p>
          {method.lastFourDigits && (
            <p className="text-sm">**** **** **** {method.lastFourDigits}</p>
          )}
          {method.expiryDate && (
            <p className="text-sm">Expires: {method.expiryDate}</p>
          )}
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
