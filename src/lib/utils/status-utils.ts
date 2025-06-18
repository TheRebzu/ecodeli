/**
 * Utilitaires pour la gestion des statuts et formatage dans l'interface
 * Fonctions réutilisables pour éviter la duplication de code
 */

import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  FileText,
  Eye,
  Building,
  Store,
  Package,
  Pill
} from "lucide-react";

// Types pour les variantes de Badge
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Obtient la variante appropriée pour un statut de réservation
 */
export function getReservationStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
    case "EXTENDED":
      return "default";
    case "PENDING":
      return "secondary";
    case "CANCELLED":
    case "OVERDUE":
      return "destructive";
    case "COMPLETED":
    default:
      return "outline";
  }
}

/**
 * Vérifie si un statut de réservation est actif
 */
export function isReservationActive(status: string): boolean {
  return ["ACTIVE", "EXTENDED"].includes(status);
}

/**
 * Obtient l'icône appropriée pour un statut de document
 */
export function getDocumentStatusIcon(status: string) {
  switch (status) {
    case "APPROVED":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "REJECTED":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "EXPIRED":
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case "PENDING":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <FileText className="h-4 w-4 text-gray-400" />;
  }
}

/**
 * Obtient le badge approprié pour un statut de document
 */
export function getDocumentStatusBadge(status: string) {
  const variants = {
    APPROVED: "default",
    REJECTED: "destructive", 
    EXPIRED: "secondary",
    PENDING: "outline",
    NOT_SUBMITTED: "outline"
  } as const;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "outline"}>
      {getDocumentStatusIcon(status)}
      <span className="ml-1">{status}</span>
    </Badge>
  );
}

/**
 * Obtient la couleur appropriée pour un statut
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED': 
      return 'bg-green-100 text-green-800';
    case 'PENDING': 
      return 'bg-yellow-100 text-yellow-800';
    case 'UNDER_REVIEW': 
      return 'bg-blue-100 text-blue-800';
    case 'REJECTED': 
      return 'bg-red-100 text-red-800';
    case 'SUSPENDED': 
      return 'bg-orange-100 text-orange-800';
    case 'INCOMPLETE': 
      return 'bg-gray-100 text-gray-800';
    default: 
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Obtient l'icône appropriée pour un statut général
 */
export function getStatusIcon(status: string) {
  switch (status) {
    case 'APPROVED': 
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'PENDING': 
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'UNDER_REVIEW': 
      return <Eye className="h-4 w-4 text-blue-600" />;
    case 'REJECTED': 
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'SUSPENDED': 
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case 'INCOMPLETE': 
      return <FileText className="h-4 w-4 text-gray-600" />;
    default: 
      return <Clock className="h-4 w-4" />;
  }
}

/**
 * Obtient la couleur appropriée pour un niveau de risque
 */
export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'LOW': 
      return 'bg-green-100 text-green-800';
    case 'MEDIUM': 
      return 'bg-yellow-100 text-yellow-800';
    case 'HIGH': 
      return 'bg-red-100 text-red-800';
    default: 
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Obtient l'icône appropriée pour un type de business
 */
export function getBusinessTypeIcon(type: string): string {
  switch (type) {
    case 'RESTAURANT': 
      return '🍽️';
    case 'RETAIL': 
      return '🛍️';
    case 'GROCERY': 
      return '🛒';
    case 'PHARMACY': 
      return '💊';
    default: 
      return '🏪';
  }
}

/**
 * Formate une devise
 */
export function formatCurrency(
  amount: number, 
  currency: string = "EUR", 
  locale: string = "fr-FR"
): string {
  return amount.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calcule le taux de croissance entre deux valeurs
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Obtient une classe CSS pour un taux de croissance
 */
export function getGrowthRateClass(growthRate: number): string {
  if (growthRate > 0) return "text-green-600";
  if (growthRate < 0) return "text-red-600";
  return "text-gray-600";
}

/**
 * Obtient le label localisé pour un rôle utilisateur
 */
export function getRoleLabel(role: string, t: (key: string) => string): string {
  return t(`roles.${role.toLowerCase()}`);
}

/**
 * Vérifie si une date est dans le futur
 */
export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Vérifie si une date est expirée
 */
export function isDateExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Obtient la variante de badge pour un rôle
 */
export function getRoleBadgeVariant(role: string): BadgeVariant {
  switch (role) {
    case "ADMIN":
      return "destructive";
    case "CLIENT":
      return "default";
    case "DELIVERER":
      return "secondary";
    case "MERCHANT":
      return "outline";
    case "PROVIDER":
      return "outline";
    default:
      return "outline";
  }
} 