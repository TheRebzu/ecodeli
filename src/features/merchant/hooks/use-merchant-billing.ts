import { useState, useEffect } from 'react'
import { 
  BillingStats, 
  BillingFilters, 
  InvoiceTemplate,
  InvoiceItem
} from '../services/billing.service'

interface UseMerchantBillingReturn {
  // Stats
  stats: BillingStats | null
  statsLoading: boolean
  statsError: string | null
  
  // Factures
  invoices: any[]
  invoicesLoading: boolean
  invoicesError: string | null
  totalPages: number
  currentPage: number
  
  // Templates
  templates: InvoiceTemplate[]
  templatesLoading: boolean
  
  // Settings
  settings: any
  settingsLoading: boolean
  
  // Actions
  refreshStats: () => void
  refreshInvoices: () => void
  loadInvoices: (filters: BillingFilters) => void
  createInvoice: (data: {
    clientEmail: string
    items: InvoiceItem[]
    dueDate?: Date
    notes?: string
  }) => Promise<boolean>
  updateInvoiceStatus: (invoiceId: string, status: string) => Promise<boolean>
  generatePDF: (invoiceId: string) => Promise<string | null>
}

export function useMerchantBilling(): UseMerchantBillingReturn {
  // Stats state
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  
  // Invoices state
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Templates state
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  
  // Settings state
  const [settings, setSettings] = useState<any>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Charger les stats
  const loadStats = async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      
      const response = await fetch('/api/merchant/billing/stats')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setStatsLoading(false)
    }
  }

  // Charger les factures
  const loadInvoices = async (filters: BillingFilters = {}) => {
    try {
      setInvoicesLoading(true)
      setInvoicesError(null)
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      
      const response = await fetch(`/api/merchant/billing/invoices?${params}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des factures')
      }
      
      const data = await response.json()
      setInvoices(data.invoices)
      setTotalPages(data.totalPages)
      setCurrentPage(data.currentPage)
    } catch (error) {
      setInvoicesError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setInvoicesLoading(false)
    }
  }

  // Charger les templates
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true)
      
      const response = await fetch('/api/merchant/billing/templates')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des templates')
      }
      
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Erreur templates:', error)
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }

  // Charger les paramètres
  const loadSettings = async () => {
    try {
      setSettingsLoading(true)
      
      const response = await fetch('/api/merchant/billing/settings')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des paramètres')
      }
      
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Erreur settings:', error)
      setSettings(null)
    } finally {
      setSettingsLoading(false)
    }
  }

  // Créer une facture
  const createInvoice = async (invoiceData: {
    clientEmail: string
    items: InvoiceItem[]
    dueDate?: Date
    notes?: string
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/merchant/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la facture')
      }
      
      // Rafraîchir les données
      await Promise.all([loadStats(), loadInvoices()])
      
      return true
    } catch (error) {
      console.error('Erreur création facture:', error)
      return false
    }
  }

  // Mettre à jour le statut d'une facture
  const updateInvoiceStatus = async (invoiceId: string, status: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/merchant/billing/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut')
      }
      
      // Rafraîchir les données
      await Promise.all([loadStats(), loadInvoices()])
      
      return true
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      return false
    }
  }

  // Générer un PDF
  const generatePDF = async (invoiceId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/merchant/billing/invoices/${invoiceId}/pdf`)
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }
      
      const data = await response.json()
      return data.pdfUrl
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      return null
    }
  }

  // Fonctions de refresh
  const refreshStats = () => loadStats()
  const refreshInvoices = () => loadInvoices()

  // Chargement initial
  useEffect(() => {
    loadStats()
    loadInvoices()
    loadTemplates()
    loadSettings()
  }, [])

  return {
    // Stats
    stats,
    statsLoading,
    statsError,
    
    // Factures
    invoices,
    invoicesLoading,
    invoicesError,
    totalPages,
    currentPage,
    
    // Templates
    templates,
    templatesLoading,
    
    // Settings
    settings,
    settingsLoading,
    
    // Actions
    refreshStats,
    refreshInvoices,
    loadInvoices,
    createInvoice,
    updateInvoiceStatus,
    generatePDF
  }
} 