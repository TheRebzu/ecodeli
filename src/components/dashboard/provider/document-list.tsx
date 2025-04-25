"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface Document {
  id: string;
  name: string;
  status: "verified" | "pending" | "rejected" | "not_uploaded";
  uploadedAt?: Date;
}

export function DocumentList({ documents = [] }: { documents?: Document[] }) {
  // This is a placeholder component

  // Default documents to show if none provided
  const defaultDocuments = [
    { id: "license", name: "Professional License", status: "not_uploaded" },
    { id: "insurance", name: "Insurance Certificate", status: "not_uploaded" },
    { id: "certifications", name: "Certifications", status: "not_uploaded" },
  ] as Document[];

  const docsToShow = documents.length > 0 ? documents : defaultDocuments;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {docsToShow.map((doc) => (
            <div key={doc.id} className="border p-4 rounded-md">
              <p className="font-medium">{doc.name}</p>
              <p className="text-muted-foreground text-sm">
                Status:{" "}
                {doc.status === "verified"
                  ? "✅ Verified"
                  : doc.status === "pending"
                    ? "⏳ Pending"
                    : doc.status === "rejected"
                      ? "❌ Rejected"
                      : "📄 Not uploaded"}
              </p>
              {doc.uploadedAt && (
                <p className="text-muted-foreground text-sm">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Upload Document</Button>
      </CardFooter>
    </Card>
  );
}
