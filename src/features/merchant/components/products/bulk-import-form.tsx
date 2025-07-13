"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/features/merchant/hooks/use-products";

interface ImportResult {
  success: boolean;
  message: string;
  row?: number;
  data?: any;
}

export function BulkImportForm() {
  const t = useTranslations("merchant.products");
  const router = useRouter();
  const { bulkImport } = useProducts();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // TODO: Parse CSV/Excel file and show preview
      setPreview([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const result = await bulkImport(file);
      setResults(result.results || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error importing products:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // TODO: Generate and download CSV template
    const template = `name,description,price,originalPrice,sku,category,brand,weight,stockQuantity,minStockAlert,tags
Product Name,Product Description,29.99,39.99,SKU001,Category,Brand,1.5,100,5,"tag1,tag2"`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/merchant/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("import.back")}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("import.title")}
            </h1>
            <p className="text-muted-foreground">{t("import.description")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("import.uploadTitle")}</CardTitle>
            <CardDescription>{t("import.uploadDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6">
              <div className="text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">
                  {t("import.dragDrop")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("import.orClick")}
                </p>
                <div className="mt-4">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("import.selectFile")}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="outline">{file.size} bytes</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? t("import.uploading") : t("import.upload")}
            </Button>
          </CardContent>
        </Card>

        {/* Template Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("import.templateTitle")}</CardTitle>
            <CardDescription>{t("import.templateDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                {t("import.templateInstructions")}
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {t("import.downloadTemplate")}
            </Button>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                {t("import.supportedColumns")}
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• name (required)</div>
                <div>• description</div>
                <div>• price (required)</div>
                <div>• originalPrice</div>
                <div>• sku</div>
                <div>• category</div>
                <div>• brand</div>
                <div>• weight</div>
                <div>• stockQuantity</div>
                <div>• minStockAlert</div>
                <div>• tags (comma-separated)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle>{t("import.resultsTitle")}</CardTitle>
            <CardDescription>
              {t("import.resultsDescription", {
                success: successCount,
                error: errorCount,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Badge
                  variant="default"
                  className="flex items-center space-x-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  <span>
                    {t("import.successCount", { count: successCount })}
                  </span>
                </Badge>
                {errorCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="flex items-center space-x-1"
                  >
                    <XCircle className="h-3 w-3" />
                    <span>{t("import.errorCount", { count: errorCount })}</span>
                  </Badge>
                )}
              </div>

              {results.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("import.results.row")}</TableHead>
                      <TableHead>{t("import.results.status")}</TableHead>
                      <TableHead>{t("import.results.message")}</TableHead>
                      <TableHead>{t("import.results.data")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.row || index + 1}</TableCell>
                        <TableCell>
                          <Badge
                            variant={result.success ? "default" : "destructive"}
                          >
                            {result.success ? (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                {t("import.results.success")}
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-1 h-3 w-3" />
                                {t("import.results.error")}
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{result.message}</TableCell>
                        <TableCell>
                          {result.data ? (
                            <div className="text-xs">
                              <div>
                                <strong>Name:</strong> {result.data.name}
                              </div>
                              <div>
                                <strong>Price:</strong> €{result.data.price}
                              </div>
                              <div>
                                <strong>SKU:</strong> {result.data.sku || "-"}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" asChild>
                  <Link href="/merchant/products">
                    {t("import.backToProducts")}
                  </Link>
                </Button>
                {errorCount > 0 && (
                  <Button onClick={() => setShowResults(false)}>
                    {t("import.tryAgain")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
