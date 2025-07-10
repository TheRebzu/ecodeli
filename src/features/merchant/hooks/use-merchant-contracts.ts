import { useState, useEffect } from 'react'
import { 
  ContractSummary, 
  ContractAmendment, 
  BillingCycle, 
  ContractStats,
  ContractTemplate 
} from '../services/contracts.service'

interface UseMerchantContractsReturn {
  // Contrat actuel
  currentContract: ContractSummary | null
  contractLoading: boolean
  contractError: string | null
  
  // Historique
  contractHistory: ContractSummary[]
  historyLoading: boolean
  historyError: string | null
  
  // Amendements
  amendments: ContractAmendment[]
  amendmentsLoading: boolean
  amendmentsError: string | null
  
  // Cycles de facturation
  billingCycles: BillingCycle[]
  billingLoading: boolean
  billingError: string | null
  totalPages: number
  currentPage: number
  
  // Statistiques
  stats: ContractStats | null
  statsLoading: boolean
  statsError: string | null
  
  // Templates
  templates: ContractTemplate[]
  templatesLoading: boolean
  templatesError: string | null
  
  // Actions
  signContract: (contractId: string, signature: string) => Promise<boolean>
  requestRenewal: (renewalData: {
    requestedCommissionRate?: number
    requestedServices?: string[]
    requestedZones?: any[]
    notes?: string
  }) => Promise<boolean>
  generatePDF: (contractId: string) => Promise<string | null>
  loadBillingCycles: (filters?: {
    status?: string
    year?: number
    page?: number
    limit?: number
  }) => void
  refreshData: () => void
  canRenew: () => Promise<{ canRenew: boolean; reason?: string; daysUntilExpiry?: number }>
}

export function useMerchantContracts(): UseMerchantContractsReturn {
  // États du contrat actuel
  const [currentContract, setCurrentContract] = useState<ContractSummary | null>(null)
  const [contractLoading, setContractLoading] = useState(true)
  const [contractError, setContractError] = useState<string | null>(null)
  
  // États de l'historique
  const [contractHistory, setContractHistory] = useState<ContractSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  
  // États des amendements
  const [amendments, setAmendments] = useState<ContractAmendment[]>([])
  const [amendmentsLoading, setAmendmentsLoading] = useState(true)
  const [amendmentsError, setAmendmentsError] = useState<string | null>(null)
  
  // États des cycles de facturation
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([])
  const [billingLoading, setBillingLoading] = useState(true)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  
  // États des statistiques
  const [stats, setStats] = useState<ContractStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  
  // États des templates
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  // Charger le contrat actuel
  const loadCurrentContract = async () => {
    try {
      setContractLoading(true)
      setContractError(null)
      
      const response = await fetch('/api/merchant/contracts/current')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du contrat')
      }
      
      const data = await response.json()
      setCurrentContract(data)
    } catch (error) {
      setContractError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setContractLoading(false)
    }
  }

  // Charger l'historique des contrats
  const loadContractHistory = async () => {
    try {
      setHistoryLoading(true)
      setHistoryError(null)
      
      const response = await fetch('/api/merchant/contracts/history')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique')
      }
      
      const data = await response.json()
      setContractHistory(data)
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Charger les amendements
  const loadAmendments = async () => {
    try {
      setAmendmentsLoading(true)
      setAmendmentsError(null)
      
      const response = await fetch('/api/merchant/contracts/amendments')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des amendements')
      }
      
      const data = await response.json()
      setAmendments(data)
    } catch (error) {
      setAmendmentsError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setAmendmentsLoading(false)
    }
  }

  // Charger les cycles de facturation
  const loadBillingCycles = async (filters: {
    status?: string
    year?: number
    page?: number
    limit?: number
  } = {}) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.year) params.append('year', filters.year.toString())
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      
      const response = await fetch(`/api/merchant/contracts/billing?${params}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la facturation')
      }
      
      const data = await response.json()
      setBillingCycles(data.cycles)
      setTotalPages(data.totalPages)
      setCurrentPage(data.currentPage)
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setBillingLoading(false)
    }
  }

  // Charger les statistiques
  const loadStats = async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      
      const response = await fetch('/api/merchant/contracts/stats')
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

  // Charger les templates
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true)
      setTemplatesError(null)
      
      const response = await fetch('/api/merchant/contracts/templates')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des templates')
      }
      
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      setTemplatesError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setTemplatesLoading(false)
    }
  }

  // Signer le contrat
  const signContract = async (contractId: string, signature: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/merchant/contracts/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractId,
          signature,
          acceptTerms: true
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la signature')
      }
      
      // Rafraîchir les données
      await Promise.all([loadCurrentContract(), loadStats()])
      
      return true
    } catch (error) {
      console.error('Erreur signature contrat:', error)
      return false
    }
  }

  // Demander un renouvellement
  const requestRenewal = async (renewalData: {
    requestedCommissionRate?: number
    requestedServices?: string[]
    requestedZones?: any[]
    notes?: string
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/merchant/contracts/renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(renewalData)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la demande de renouvellement')
      }
      
      // Rafraîchir les amendements
      await loadAmendments()
      
      return true
    } catch (error) {
      console.error('Erreur demande renouvellement:', error)
      return false
    }
  }

  // Générer le PDF du contrat
  const generatePDF = async (contractId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/merchant/contracts/${contractId}/pdf`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération PDF')
      }
      
      const data = await response.json()
      return data.pdfPath
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      return null
    }
  }

  // Vérifier si le contrat peut être renouvelé
  const canRenew = async (): Promise<{ canRenew: boolean; reason?: string; daysUntilExpiry?: number }> => {
    try {
      const response = await fetch('/api/merchant/contracts/can-renew')
      if (!response.ok) {
        return { canRenew: false, reason: 'Erreur de vérification' }
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return { canRenew: false, reason: 'Erreur de vérification' }
    }
  }

  // Fonction de refresh générale
  const refreshData = () => {
    loadCurrentContract()
    loadContractHistory()
    loadAmendments()
    loadBillingCycles()
    loadStats()
    loadTemplates()
  }

  // Chargement initial
  useEffect(() => {
    loadCurrentContract()
    loadContractHistory()
    loadAmendments()
    loadBillingCycles()
    loadStats()
    loadTemplates()
  }, [])

  return {
    // Contrat actuel
    currentContract,
    contractLoading,
    contractError,
    
    // Historique
    contractHistory,
    historyLoading,
    historyError,
    
    // Amendements
    amendments,
    amendmentsLoading,
    amendmentsError,
    
    // Cycles de facturation
    billingCycles,
    billingLoading,
    billingError,
    totalPages,
    currentPage,
    
    // Statistiques
    stats,
    statsLoading,
    statsError,
    
    // Templates
    templates,
    templatesLoading,
    templatesError,
    
    // Actions
    signContract,
    requestRenewal,
    generatePDF,
    loadBillingCycles,
    refreshData,
    canRenew
  }
}

// Hook pour gérer les filtres de facturation
export function useBillingFilters() {
  const [filters, setFilters] = useState({
    status: 'ALL',
    year: new Date().getFullYear(),
    page: 1,
    limit: 12
  })

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const resetFilters = () => {
    setFilters({
      status: 'ALL',
      year: new Date().getFullYear(),
      page: 1,
      limit: 12
    })
  }

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters
  }
}

// Hook pour gérer la signature électronique
export function useContractSignature() {
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false)
  const [signatureData, setSignatureData] = useState('')
  const [isAccepted, setIsAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openSigningModal = () => {
    setIsSigningModalOpen(true)
    setSignatureData('')
    setIsAccepted(false)
  }

  const closeSigningModal = () => {
    setIsSigningModalOpen(false)
    setSignatureData('')
    setIsAccepted(false)
  }

  const canSubmitSignature = () => {
    return signatureData.trim().length > 0 && isAccepted && !isSubmitting
  }

  return {
    isSigningModalOpen,
    signatureData,
    setSignatureData,
    isAccepted,
    setIsAccepted,
    isSubmitting,
    setIsSubmitting,
    openSigningModal,
    closeSigningModal,
    canSubmitSignature
  }
} 