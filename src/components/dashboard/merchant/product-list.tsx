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
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: "active" | "draft" | "out_of_stock";
}

export function ProductList({ products = [] }: { products?: Product[] }) {
  // This is a placeholder component
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length > 0 ? (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.price.toFixed(2)} €</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  {product.status === "active"
                    ? "🟢 Active"
                    : product.status === "draft"
                      ? "🟠 Draft"
                      : "🔴 Out of stock"}
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
              <TableCell colSpan={5} className="text-center">
                No products yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="mt-4 flex justify-end">
        <Button asChild>
          <Link href="/merchant/products/new">Add New Product</Link>
        </Button>
      </div>
    </div>
  );
}
