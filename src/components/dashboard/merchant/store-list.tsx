"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface Store {
  id: string;
  name: string;
  address: string;
  status: "active" | "pending" | "closed";
}

export function StoreList({ stores = [] }: { stores?: Store[] }) {
  // This is a placeholder component
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {stores.length > 0 ? (
            stores.map((store) => (
              <div key={store.id} className="border p-4 rounded-md">
                <p className="font-medium">{store.name}</p>
                <p className="text-muted-foreground text-sm">{store.address}</p>
                <p className="text-muted-foreground text-sm">
                  Status:{" "}
                  {store.status === "active"
                    ? "🟢 Active"
                    : store.status === "pending"
                      ? "🟠 Pending"
                      : "🔴 Closed"}
                </p>
              </div>
            ))
          ) : (
            <div className="border p-4 rounded-md">
              <p className="font-medium">No stores found</p>
              <p className="text-muted-foreground text-sm">
                Add a store to start selling products
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Add New Store</Button>
      </CardFooter>
    </Card>
  );
}
