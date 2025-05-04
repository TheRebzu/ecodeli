'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, 
  Download, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Ban
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Types
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOIDED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  issuedDate: Date;
  paidDate?: Date;
  pdfUrl?: string;
  items: InvoiceItem[];
}

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading?: boolean;
  onDownload: (invoiceId: string) => void;
  onViewDetails: (invoiceId: string) => void;
}

export function InvoiceList({
  invoices,
  isLoading = false,
  onDownload,
  onViewDetails
}: InvoiceListProps) {
  const t = useTranslations('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'issuedDate' | 'dueDate' | 'amount'>('issuedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fonction pour obtenir l'icône de statut
  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'SENT':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'OVERDUE':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'DRAFT':
        return <FileText className="h-4 w-4 text-slate-500" />;
      case 'VOIDED':
        return <Ban className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Fonction pour obtenir la couleur du badge de statut
  const getStatusBadgeStyle = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return "bg-green-50 text-green-700 border-green-200";
      case 'SENT':
        return "bg-amber-50 text-amber-700 border-amber-200";
      case 'OVERDUE':
        return "bg-red-50 text-red-700 border-red-200";
      case 'DRAFT':
        return "bg-slate-50 text-slate-700 border-slate-200";
      case 'VOIDED':
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "";
    }
  };

  // Filtrer les factures
  const filteredInvoices = invoices.filter(invoice => {
    // Filtre de recherche
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.items.some(item => item.description.toLowerCase().includes(searchQuery.toLowerCase())));
      
    // Filtre de statut
    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Trier les factures
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === 'amount') {
      return sortOrder === 'asc' 
        ? a.amount - b.amount
        : b.amount - a.amount;
    } else {
      const dateA = new Date(sortBy === 'issuedDate' ? a.issuedDate : a.dueDate);
      const dateB = new Date(sortBy === 'issuedDate' ? b.issuedDate : b.dueDate);
      return sortOrder === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const paginatedInvoices = sortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => { 
                e.preventDefault();
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }} 
              disabled={currentPage === 1}
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }, (_, i) => (
            <PaginationItem key={i}>
              <PaginationLink 
                href="#" 
                onClick={(e) => { 
                  e.preventDefault();
                  setCurrentPage(i + 1);
                }}
                isActive={currentPage === i + 1}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => { 
                e.preventDefault();
                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
              }} 
              disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filtre par statut */}
        <div className="w-full md:w-auto">
          <Select 
            value={statusFilter} 
            onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'ALL')}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('statusFilter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('allStatuses')}</SelectItem>
              <SelectItem value="PAID">{t('statusPaid')}</SelectItem>
              <SelectItem value="SENT">{t('statusSent')}</SelectItem>
              <SelectItem value="OVERDUE">{t('statusOverdue')}</SelectItem>
              <SelectItem value="DRAFT">{t('statusDraft')}</SelectItem>
              <SelectItem value="VOIDED">{t('statusVoided')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tri */}
        <div className="w-full md:w-auto flex gap-2">
          <Select 
            value={sortBy} 
            onValueChange={(value) => setSortBy(value as 'issuedDate' | 'dueDate' | 'amount')}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="issuedDate">{t('sortByIssuedDate')}</SelectItem>
              <SelectItem value="dueDate">{t('sortByDueDate')}</SelectItem>
              <SelectItem value="amount">{t('sortByAmount')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={sortOrder} 
            onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('sortOrder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">{t('sortDesc')}</SelectItem>
              <SelectItem value="asc">{t('sortAsc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des factures */}
      <Card>
        {isLoading ? (
          <div className="p-6 text-center">
            <p>{t('loading')}</p>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{t('noInvoicesFound')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoiceNumber')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('dueDate')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewDetails(invoice.id)}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{format(new Date(invoice.issuedDate), 'dd MMM yyyy', { locale: fr })}</TableCell>
                  <TableCell>{format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: fr })}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.status)}
                      <Badge className={getStatusBadgeStyle(invoice.status)} variant="outline">
                        {t(`status${invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}`)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(invoice.id);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="sr-only">{t('view')}</span>
                      </Button>
                      
                      {invoice.pdfUrl && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(invoice.id);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">{t('download')}</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {/* Pagination */}
        {renderPagination()}
      </Card>
    </div>
  );
} 