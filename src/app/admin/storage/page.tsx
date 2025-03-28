import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Search, 
  Upload, 
  Trash2, 
  FileText, 
  Image, 
  File, 
  FileArchive 
} from "lucide-react";
import Link from "next/link";

// Simulons des données de stockage pour la démonstration
interface StorageItem {
  id: string;
  name: string;
  type: "image" | "document" | "archive" | "other";
  size: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

const mockStorageItems: StorageItem[] = [
  {
    id: "1",
    name: "product-image-1.jpg",
    type: "image",
    size: 1245000,
    path: "/uploads/products/",
    createdAt: new Date("2023-08-10"),
    updatedAt: new Date("2023-08-10"),
  },
  {
    id: "2",
    name: "invoice-00123.pdf",
    type: "document",
    size: 524000,
    path: "/uploads/invoices/",
    createdAt: new Date("2023-07-15"),
    updatedAt: new Date("2023-07-15"),
  },
  {
    id: "3",
    name: "deliveries-june-2023.zip",
    type: "archive",
    size: 3200000,
    path: "/uploads/reports/",
    createdAt: new Date("2023-07-01"),
    updatedAt: new Date("2023-07-01"),
  },
  {
    id: "4",
    name: "merchant-contract.pdf",
    type: "document",
    size: 750000,
    path: "/uploads/contracts/",
    createdAt: new Date("2023-06-22"),
    updatedAt: new Date("2023-06-22"),
  },
  {
    id: "5",
    name: "warehouse-schema.jpg",
    type: "image",
    size: 2100000,
    path: "/uploads/warehouses/",
    createdAt: new Date("2023-06-10"),
    updatedAt: new Date("2023-06-10"),
  },
];

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFileIcon(type: string) {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    case "archive":
      return <FileArchive className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

export default async function StoragePage() {
  const storageItems = mockStorageItems;
  
  // Statistiques
  const totalFiles = storageItems.length;
  const totalSize = storageItems.reduce((acc, item) => acc + item.size, 0);
  const imagesCount = storageItems.filter(item => item.type === "image").length;
  const documentsCount = storageItems.filter(item => item.type === "document").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestion du stockage</h1>
          <p className="text-slate-500">
            Gérez les fichiers et documents stockés dans l&apos;application
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            <span>Importer un fichier</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total fichiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Espace utilisé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{imagesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentsCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Fichiers stockés</CardTitle>
              <CardDescription>
                {totalFiles} fichiers · {formatBytes(totalSize)} d&apos;espace utilisé
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Rechercher un fichier..."
                className="w-full pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-100 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left font-medium">Nom</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Taille</th>
                  <th className="px-4 py-3 text-left font-medium">Chemin</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {storageItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      {getFileIcon(item.type)}
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatBytes(item.size)}</td>
                    <td className="px-4 py-3 text-slate-500">{item.path}</td>
                    <td className="px-4 py-3">
                      {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Aperçu</span>
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Supprimer</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 