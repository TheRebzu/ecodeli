"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Calendar,
  BarChart,
  PieChart,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Share,
  MoreHorizontal,
  Truck,
  ShoppingCart,
  Users,
  Euro,
  Package,
  Clock,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import React, { ReactNode } from "react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

// Report Types
type ReportCategory = "sales" | "deliveries" | "users" | "merchants" | "finance" | "performance" | "financial" | "operational" | "analytics";
type ReportFormat = "pdf" | "csv" | "excel";
type ReportFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
type ReportStatus = "pending" | "in_progress" | "completed" | "cancelled" | "generated" | "scheduled" | "failed";

interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  format: ReportFormat;
  frequency: ReportFrequency;
  status: ReportStatus;
  lastGenerated: Date | null;
  nextGeneration: Date | null;
  createdAt: Date;
  fileSize: string | null;
  downloadCount: number;
}

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  availableFormats: ReportFormat[];
  parameters: {
    name: string;
    type: "date" | "select" | "boolean" | "number" | "text";
    label: string;
    options?: string[];
    required: boolean;
  }[];
}

// Category configuration
const CATEGORY_CONFIG: Record<ReportCategory, { color: string; label: string; icon: any }> = {
  sales: {
    color: "green",
    label: "Ventes",
    icon: Euro,
  },
  deliveries: {
    color: "blue",
    label: "Livraisons",
    icon: Truck,
  },
  users: {
    color: "purple",
    label: "Utilisateurs",
    icon: Users,
  },
  merchants: {
    color: "amber",
    label: "Commerçants",
    icon: ShoppingCart,
  },
  finance: {
    color: "indigo",
    label: "Finance",
    icon: Euro,
  },
  performance: {
    color: "orange",
    label: "Performance",
    icon: BarChart,
  },
  financial: {
    color: "indigo",
    label: "Finance",
    icon: Euro,
  },
  operational: {
    color: "green",
    label: "Opérationnel",
    icon: Truck,
  },
  analytics: {
    color: "purple",
    label: "Analytique",
    icon: BarChart,
  },
};

// Format configuration
const FORMAT_CONFIG: Record<ReportFormat, { label: string; icon: any }> = {
  pdf: {
    label: "PDF",
    icon: FileText,
  },
  csv: {
    label: "CSV",
    icon: FileText,
  },
  excel: {
    label: "Excel",
    icon: FileText,
  },
};

// Status configuration
const STATUS_CONFIG = {
  "pending": { color: "amber", label: "En attente" },
  "in_progress": { color: "blue", label: "En cours" },
  "completed": { color: "green", label: "Terminé" },
  "cancelled": { color: "red", label: "Annulé" },
};

// Frequency configuration
const FREQUENCY_CONFIG: Record<ReportFrequency, { label: string; icon: any }> = {
  daily: {
    label: "Quotidien",
    icon: Calendar,
  },
  weekly: {
    label: "Hebdomadaire",
    icon: Calendar,
  },
  monthly: {
    label: "Mensuel",
    icon: Calendar,
  },
  quarterly: {
    label: "Trimestriel",
    icon: Calendar,
  },
  yearly: {
    label: "Annuel",
    icon: Calendar,
  },
  custom: {
    label: "Personnalisé",
    icon: Calendar,
  },
};

// Update REPORT_TYPES_BY_CATEGORY to include all possible category values
const REPORT_TYPES_BY_CATEGORY: Record<ReportCategory, string[]> = {
  sales: ["Ventes totales", "Ventes par région", "Ventes par produit", "Ventes par client"],
  deliveries: ["Livraisons totales", "Temps de livraison", "Performance des livreurs", "Zones de livraison"],
  users: ["Nouveaux utilisateurs", "Utilisateurs actifs", "Rétention", "Engagement"],
  merchants: ["Marchands actifs", "Performance des marchands", "Commissions", "Satisfaction"],
  finance: ["Revenus", "Dépenses", "Bénéfices", "Prévisions"],
  performance: ["KPIs", "Objectifs", "Croissance", "Comparaison"],
  financial: ["Bilans financiers", "Flux de trésorerie", "Analyse des coûts"],
  operational: ["Efficacité opérationnelle", "Gestion des ressources", "Logistique"],
  analytics: ["Tendances du marché", "Analyse concurrentielle", "Prévisions"]
};

// Generate mock reports
function generateMockReports(count: number): Report[] {
  const categories: ReportCategory[] = ["sales", "deliveries", "users", "merchants", "finance", "performance"];
  const formats: ReportFormat[] = ["pdf", "csv", "excel"];
  const frequencies: ReportFrequency[] = ["daily", "weekly", "monthly", "quarterly", "yearly", "custom"];
  const statuses: ReportStatus[] = ["generated", "scheduled", "failed"];
  
  const reportTitles = {
    sales: ["Rapport de ventes", "Analyse des revenus", "Résumé des transactions", "Performance des produits"],
    deliveries: ["Rapport de livraisons", "Performance des livreurs", "Délais de livraison", "Zones de livraison"],
    users: ["Rapport utilisateurs", "Activité des clients", "Nouveaux utilisateurs", "Utilisateurs actifs"],
    merchants: ["Rapport marchands", "Performance des marchands", "Activité des marchands", "Nouveaux marchands"],
    finance: ["Rapport financier", "Flux de trésorerie", "Analyse des coûts", "Prévisions financières"],
    performance: ["Rapport de performance", "Analyse des KPIs", "Indicateurs clés", "Objectifs et résultats"],
  };
  
  return Array.from({ length: count }).map((_, i) => {
    const category = categories[Math.floor(Math.random() * categories.length)] as ReportCategory;
    const format = formats[Math.floor(Math.random() * formats.length)] as ReportFormat;
    const frequency = frequencies[Math.floor(Math.random() * frequencies.length)] as ReportFrequency;
    const status = statuses[Math.floor(Math.random() * statuses.length)] as ReportStatus;
    
    // Generate dates
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 60)); // Random date in the last 60 days
    
    let lastGenerated: Date | null = null;
    if (status === "generated" || status === "failed") {
      lastGenerated = new Date(createdAt);
      lastGenerated.setHours(createdAt.getHours() + Math.floor(Math.random() * 240)); // 0-240 hours after creation
    }
    
    let nextGeneration: Date | null = null;
    if (status === "scheduled" || (status === "generated" && frequency !== "custom")) {
      nextGeneration = new Date();
      switch (frequency) {
        case "daily":
          nextGeneration.setDate(nextGeneration.getDate() + 1);
          break;
        case "weekly":
          nextGeneration.setDate(nextGeneration.getDate() + 7);
          break;
        case "monthly":
          nextGeneration.setMonth(nextGeneration.getMonth() + 1);
          break;
        case "quarterly":
          nextGeneration.setMonth(nextGeneration.getMonth() + 3);
          break;
        case "yearly":
          nextGeneration.setFullYear(nextGeneration.getFullYear() + 1);
          break;
      }
    }
    
    // Generate file size for generated reports
    let fileSize: string | null = null;
    if (status === "generated") {
      const size = Math.floor(Math.random() * 10000) + 100; // 100KB to 10MB
      fileSize = size >= 1000 ? `${(size / 1000).toFixed(1)} MB` : `${size} KB`;
    }
    
    // Select a report title based on the category
    const titles = reportTitles[category];
    const title = titles[Math.floor(Math.random() * titles.length)];
    
    // Generate a description based on the title and frequency
    let description = "";
    if (frequency === "custom") {
      description = `Rapport personnalisé ${title.toLowerCase()}`;
    } else {
      description = `${title} ${FREQUENCY_CONFIG[frequency].label.toLowerCase()}`;
    }
    
    return {
      id: `report-${i + 1}`,
      title,
      description,
      category,
      format,
      frequency,
      status,
      lastGenerated,
      nextGeneration,
      createdAt,
      fileSize,
      downloadCount: Math.floor(Math.random() * 50),
    };
  });
}

// Generate report templates
function generateReportTemplates(): ReportTemplate[] {
  // Use only categories from the original ReportCategory type
  const categories: ReportCategory[] = ["sales", "deliveries", "users", "merchants", "finance", "performance"];
  
  // Template titles by category
  const titles = {
    sales: ["Rapport de ventes", "Analyse des ventes", "Performance commerciale"],
    deliveries: ["Rapport de livraisons", "Performance de livraison", "Analyse logistique"],
    users: ["Rapport utilisateurs", "Analyse des utilisateurs", "Engagement client"],
    merchants: ["Rapport marchands", "Performance des marchands", "Analyse des partenaires"],
    finance: ["Rapport financier", "Bilan financier", "Analyse des revenus"],
    performance: ["KPIs", "Indicateurs de performance", "Tableau de bord"]
  };
  
  return [
    {
      id: "template-1",
      title: "Rapport de ventes",
      description: "Analyse des ventes sur une période donnée",
      category: "sales",
      availableFormats: ["pdf", "csv", "excel"],
      parameters: [
        {
          name: "dateRange",
          type: "date",
          label: "Période",
          required: true,
        },
        {
          name: "merchant",
          type: "select",
          label: "Commerçant",
          options: ["Tous", "Commerçant 1", "Commerçant 2", "Commerçant 3"],
          required: false,
        },
        {
          name: "includeGraphs",
          type: "boolean",
          label: "Inclure des graphiques",
          required: false,
        },
      ],
    },
    {
      id: "template-2",
      title: "Performance des livreurs",
      description: "Analyse de la performance des livreurs",
      category: "deliveries",
      availableFormats: ["pdf", "excel"],
      parameters: [
        {
          name: "dateRange",
          type: "date",
          label: "Période",
          required: true,
        },
        {
          name: "deliverer",
          type: "select",
          label: "Livreur",
          options: ["Tous", "Livreur 1", "Livreur 2", "Livreur 3"],
          required: false,
        },
        {
          name: "metrics",
          type: "select",
          label: "Métriques",
          options: ["Toutes", "Délai de livraison", "Satisfaction client", "Nombre de livraisons"],
          required: true,
        },
      ],
    },
    {
      id: "template-3",
      title: "Nouveaux utilisateurs",
      description: "Rapport sur les nouveaux utilisateurs inscrits",
      category: "users",
      availableFormats: ["pdf", "csv"],
      parameters: [
        {
          name: "dateRange",
          type: "date",
          label: "Période",
          required: true,
        },
        {
          name: "userType",
          type: "select",
          label: "Type d'utilisateur",
          options: ["Tous", "Clients", "Commerçants", "Livreurs"],
          required: false,
        },
      ],
    },
    {
      id: "template-4",
      title: "Rapport financier",
      description: "Analyse financière complète",
      category: "finance",
      availableFormats: ["pdf", "excel"],
      parameters: [
        {
          name: "dateRange",
          type: "date",
          label: "Période",
          required: true,
        },
        {
          name: "includeProjections",
          type: "boolean",
          label: "Inclure des projections",
          required: false,
        },
        {
          name: "comparisonPeriod",
          type: "select",
          label: "Période de comparaison",
          options: ["Aucune", "Mois précédent", "Année précédente"],
          required: false,
        },
      ],
    },
    {
      id: "template-5",
      title: "Analyse des KPIs",
      description: "Suivi des indicateurs clés de performance",
      category: "performance",
      availableFormats: ["pdf", "excel"],
      parameters: [
        {
          name: "dateRange",
          type: "date",
          label: "Période",
          required: true,
        },
        {
          name: "kpis",
          type: "select",
          label: "KPIs",
          options: ["Tous", "Ventes", "Livraisons", "Utilisateurs", "Coûts"],
          required: true,
        },
        {
          name: "format",
          type: "select",
          label: "Format",
          options: ["Détaillé", "Résumé", "Présentation"],
          required: false,
        },
      ],
    },
  ];
}

// Mock data
const mockReports = generateMockReports(30);
const reportTemplates = generateReportTemplates();

// Report List Component
function ReportList({ reports }: { reports: Report[] }) {
  const router = useRouter();
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Fréquence</TableHead>
            <TableHead>Dernière génération</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Taille</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">
                <div>
                  <div>{report.title}</div>
                  <div className="text-xs text-muted-foreground">{report.description}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1">
                  {CATEGORY_CONFIG[report.category].icon && 
                    React.createElement(CATEGORY_CONFIG[report.category].icon, { className: "h-3 w-3" })
                  }
                  {CATEGORY_CONFIG[report.category].label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1">
                  {FORMAT_CONFIG[report.format].icon && 
                    React.createElement(FORMAT_CONFIG[report.format].icon, { className: "h-3 w-3" })
                  }
                  {FORMAT_CONFIG[report.format].label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1">
                  {FREQUENCY_CONFIG[report.frequency].icon && 
                    React.createElement(FREQUENCY_CONFIG[report.frequency].icon, { className: "h-3 w-3" })
                  }
                  {FREQUENCY_CONFIG[report.frequency].label}
                </Badge>
              </TableCell>
              <TableCell>
                {report.lastGenerated 
                  ? format(report.lastGenerated, "dd/MM/yyyy", { locale: fr }) 
                  : "Jamais"}
              </TableCell>
              <TableCell>
                {report.status === "pending" && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {STATUS_CONFIG.pending.label}
                  </Badge>
                )}
                {report.status === "in_progress" && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {STATUS_CONFIG.in_progress.label}
                  </Badge>
                )}
                {report.status === "completed" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {STATUS_CONFIG.completed.label}
                  </Badge>
                )}
                {report.status === "cancelled" && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {STATUS_CONFIG.cancelled.label}
                  </Badge>
                )}
              </TableCell>
              <TableCell>{report.fileSize || "N/A"}</TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {report.status === "generated" && (
                        <DropdownMenuItem onClick={() => alert(`Téléchargement du rapport: ${report.id}`)}>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => router.push(`/admin/reports/${report.id}`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => alert(`Régénération du rapport: ${report.id}`)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Régénérer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => alert(`Partage du rapport: ${report.id}`)}>
                        <Share className="mr-2 h-4 w-4" />
                        Partager
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Template Card Component
function TemplateCard({ template }: { template: ReportTemplate }) {
  const router = useRouter();
  const { icon: CategoryIcon } = CATEGORY_CONFIG[template.category];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{template.title}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </div>
          {template.category === "financial" && (
            <div className="p-2 rounded-full bg-blue-50">
              <CategoryIcon className="h-5 w-5 text-blue-700" />
            </div>
          )}
          {template.category === "operational" && (
            <div className="p-2 rounded-full bg-green-50">
              <CategoryIcon className="h-5 w-5 text-green-700" />
            </div>
          )}
          {template.category === "analytics" && (
            <div className="p-2 rounded-full bg-purple-50">
              <CategoryIcon className="h-5 w-5 text-purple-700" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Formats disponibles</p>
            <div className="flex gap-2 mt-1">
              {template.availableFormats.map((format) => (
                <Badge key={format} variant="outline" className="flex items-center gap-1">
                  {FORMAT_CONFIG[format].icon && 
                    React.createElement(FORMAT_CONFIG[format].icon, { className: "h-3 w-3" })
                  }
                  {FORMAT_CONFIG[format].label}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Paramètres requis</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {template.parameters.map((param) => (
                <Badge key={param.name} variant={param.required ? "default" : "outline"} className="flex items-center gap-1">
                  {param.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => router.push(`/admin/reports/create?template=${template.id}`)}>
          Générer un rapport
        </Button>
      </CardFooter>
    </Card>
  );
}

// Fix DateRange interface to match the component props
function ReportFilters({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoryFilter: ReportCategory | "all";
  setCategoryFilter: (value: ReportCategory | "all") => void;
  statusFilter: ReportStatus | "all";
  setStatusFilter: (value: ReportStatus | "all") => void;
  dateRange: DateRange | undefined;
  setDateRange: (value: DateRange | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1 space-y-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par titre ou description..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ReportCategory | "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReportStatus | "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <DatePickerWithRange 
          date={dateRange} 
          setDate={setDateRange} 
          className="w-[300px]" 
        />
      </div>
    </div>
  );
}

// Main Page Component
export default function AdminReportsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [activeTab, setActiveTab] = useState<"reports" | "templates">("reports");
  
  // Filter reports
  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      searchTerm === "" ||
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || report.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    
    const matchesDateRange =
      (!dateRange?.from || (report.lastGenerated && report.lastGenerated >= dateRange.from)) &&
      (!dateRange?.to || (report.lastGenerated && report.lastGenerated <= dateRange.to));
    
    return matchesSearch && matchesCategory && matchesStatus && (dateRange?.from ? matchesDateRange : true);
  });
  
  // Filter templates
  const filteredTemplates = reportTemplates.filter((template) => {
    const matchesSearch =
      searchTerm === "" ||
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  // Sort reports by last generated date (newest first)
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (!a.lastGenerated && !b.lastGenerated) return 0;
    if (!a.lastGenerated) return 1;
    if (!b.lastGenerated) return -1;
    return b.lastGenerated.getTime() - a.lastGenerated.getTime();
  });
  
  // Group reports by category for stats
  const reportsByCategory = mockReports.reduce(
    (acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    },
    {} as Record<ReportCategory, number>
  );
  
  // Statistics for different time periods
  const today = new Date();
  const reportsToday = mockReports.filter((report) => 
    report.lastGenerated && 
    report.lastGenerated.toDateString() === today.toDateString()
  ).length;
  
  const reportsThisWeek = mockReports.filter((report) => 
    report.lastGenerated && 
    report.lastGenerated >= subDays(today, 7)
  ).length;
  
  const reportsThisMonth = mockReports.filter((report) => 
    report.lastGenerated && 
    report.lastGenerated >= subMonths(today, 1)
  ).length;
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground">
            Générez, consultez et partagez des rapports sur l'activité de la plateforme
          </p>
        </div>
        <Button onClick={() => router.push("/admin/reports/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau rapport
        </Button>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Rapports aujourd'hui</p>
                <p className="text-3xl font-bold">{reportsToday}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Rapports cette semaine</p>
                <p className="text-3xl font-bold">{reportsThisWeek}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Rapports ce mois</p>
                <p className="text-3xl font-bold">{reportsThisMonth}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <BarChart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total des rapports</p>
                <p className="text-3xl font-bold">{mockReports.length}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Object.entries(CATEGORY_CONFIG).map(([key, { label, color, icon: Icon }]) => {
          const count = reportsByCategory[key as ReportCategory] || 0;
          return (
            <Card key={key} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-muted-foreground text-sm">{label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  {color === "green" && (
                    <div className="p-3 rounded-full bg-green-50">
                      <Icon className="h-5 w-5 text-green-700" />
                    </div>
                  )}
                  {color === "blue" && (
                    <div className="p-3 rounded-full bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-700" />
                    </div>
                  )}
                  {color === "purple" && (
                    <div className="p-3 rounded-full bg-purple-50">
                      <Icon className="h-5 w-5 text-purple-700" />
                    </div>
                  )}
                  {color === "amber" && (
                    <div className="p-3 rounded-full bg-amber-50">
                      <Icon className="h-5 w-5 text-amber-700" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Tabs and filters */}
      <Tabs 
        defaultValue="reports" 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "reports" | "templates")}
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="reports">Mes rapports</TabsTrigger>
            <TabsTrigger value="templates">Modèles de rapports</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="mb-6">
          <ReportFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
        </div>
        
        <TabsContent value="reports" className="space-y-4">
          {sortedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border rounded-md">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun rapport trouvé</h3>
              <p className="text-muted-foreground text-center mb-4">
                Aucun rapport ne correspond à vos critères de recherche.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setDateRange(undefined);
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <ReportList reports={sortedReports} />
          )}
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border rounded-md">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun modèle trouvé</h3>
              <p className="text-muted-foreground text-center mb-4">
                Aucun modèle ne correspond à vos critères de recherche.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 