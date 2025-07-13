"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/features/merchant/hooks/useProducts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function BulkImportForm() {
  const t = useTranslations("merchant.products");
  const router = useRouter();
  const { bulkImport } = useProducts();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Mock preview data
      setPreview([
        {
          name: "Sample Product 1",
          price: "29.99",
          category: "Electronics",
          stock: "10",
        },
        {
          name: "Sample Product 2",
          price: "19.99",
          category: "Clothing",
          stock: "25",
        },
      ]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await bulkImport(selectedFile);
      setImportResult({
        success: 15,
        failed: 2,
        errors: [
          "Invalid price format on row 3",
          "Missing required field on row 8",
        ],
      });
    } catch (error) {
      setImportResult({
        success: 0,
        failed: 17,
        errors: ["Upload failed: Invalid file format"],
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Mock template download
    const csvContent =
      'name,description,price,originalPrice,sku,category,brand,weight,stockQuantity,minStockAlert,tags\nSample Product,Description,29.99,39.99,SKU001,Electronics,Brand,0.5,10,5,"tag1,tag2"';
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("import.upload.title")}</CardTitle>
          <CardDescription>{t("import.upload.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              {t("import.upload.dragDrop")}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("import.upload.supportedFormats")}
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild>
              <label htmlFor="file-upload">
                {t("import.upload.selectFile")}
              </label>
            </Button>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span className="font-medium">{selectedFile.name}</span>
                <Badge variant="secondary">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              {t("import.downloadTemplate")}
            </Button>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t("import.upload.button")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("import.preview.title")}</CardTitle>
            <CardDescription>{t("import.preview.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      {t("import.preview.name")}
                    </th>
                    <th className="text-left p-2">
                      {t("import.preview.price")}
                    </th>
                    <th className="text-left p-2">
                      {t("import.preview.category")}
                    </th>
                    <th className="text-left p-2">
                      {t("import.preview.stock")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.price}€</td>
                      <td className="p-2">{item.category}</td>
                      <td className="p-2">{item.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>{t("import.results.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    {t("import.results.success")}
                  </p>
                  <p className="text-sm text-green-700">
                    {importResult.success} {t("import.results.products")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">
                    {t("import.results.failed")}
                  </p>
                  <p className="text-sm text-red-700">
                    {importResult.failed} {t("import.results.products")}
                  </p>
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  {t("import.results.errors")}
                </h4>
                <ul className="space-y-1">
                  {importResult.errors.map((error, index) => (
                    <li
                      key={index}
                      className="text-sm text-red-600 flex items-center space-x-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => router.push("/merchant/products")}
              >
                {t("actions.backToList")}
              </Button>
              <Button
                onClick={() => {
                  setImportResult(null);
                  setSelectedFile(null);
                  setPreview([]);
                }}
              >
                {t("import.results.importMore")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
