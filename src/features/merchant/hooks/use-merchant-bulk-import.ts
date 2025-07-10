import { useState, useCallback } from 'react'
import { 
  ImportedAnnouncement, 
  ImportValidationError, 
  ImportResult, 
  ImportSession,
  ImportTemplate,
  BulkImportService 
} from '../services/bulk-import.service'

interface UseMerchantBulkImportReturn {
  // État du fichier
  selectedFile: File | null
  setSelectedFile: (file: File | null) => void
  
  // État du parsing
  parsedData: any[]
  parsedHeaders: string[]
  parseErrors: string[]
  isParsing: boolean
  
  // État de validation
  validatedData: ImportedAnnouncement[]
  validationErrors: ImportValidationError[]
  isValidating: boolean
  
  // État d'import
  importResult: ImportResult | null
  isImporting: boolean
  importError: string | null
  
  // Historique
  importHistory: ImportSession[]
  historyLoading: boolean
  historyError: string | null
  
  // Templates
  templates: ImportTemplate[]
  selectedTemplate: string
  setSelectedTemplate: (template: string) => void
  
  // Actions
  parseFile: (file: File) => Promise<void>
  validateData: () => void
  importData: () => Promise<void>
  downloadTemplate: (templateName: string) => void
  loadImportHistory: () => Promise<void>
  resetImport: () => void
  
  // Utilitaires
  canProceedToValidation: boolean
  canProceedToImport: boolean
  hasErrors: boolean
  totalRows: number
  validRows: number
  errorRows: number
}

export function useMerchantBulkImport(): UseMerchantBulkImportReturn {
  // État du fichier
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // État du parsing
  const [parsedData, setParsedData] = useState<any[]>([])
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)
  
  // État de validation
  const [validatedData, setValidatedData] = useState<ImportedAnnouncement[]>([])
  const [validationErrors, setValidationErrors] = useState<ImportValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  
  // État d'import
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  
  // Historique
  const [importHistory, setImportHistory] = useState<ImportSession[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  
  // Templates
  const [templates] = useState<ImportTemplate[]>(BulkImportService.getImportTemplates())
  const [selectedTemplate, setSelectedTemplate] = useState('Standard')

  // Parser le fichier
  const parseFile = useCallback(async (file: File) => {
    setIsParsing(true)
    setParseErrors([])
    setParsedData([])
    setParsedHeaders([])
    
    try {
      const result = await BulkImportService.parseFile(file)
      
      setParsedData(result.data)
      setParsedHeaders(result.headers)
      setParseErrors(result.errors)
      
      if (result.errors.length === 0 && result.data.length > 0) {
        // Auto-validation si le parsing est OK
        validateParsedData(result.data)
      }
    } catch (error) {
      setParseErrors([error instanceof Error ? error.message : 'Erreur de parsing'])
    } finally {
      setIsParsing(false)
    }
  }, [])

  // Valider les données parsées
  const validateParsedData = useCallback((data: any[]) => {
    setIsValidating(true)
    setValidationErrors([])
    setValidatedData([])
    
    try {
      const result = BulkImportService.validateImportData(data)
      setValidatedData(result.validRows)
      setValidationErrors(result.errors)
    } catch (error) {
      setValidationErrors([{
        row: 0,
        field: 'general',
        value: '',
        error: error instanceof Error ? error.message : 'Erreur de validation'
      }])
    } finally {
      setIsValidating(false)
    }
  }, [])

  // Valider les données actuelles
  const validateData = useCallback(() => {
    if (parsedData.length > 0) {
      validateParsedData(parsedData)
    }
  }, [parsedData, validateParsedData])

  // Importer les données
  const importData = useCallback(async () => {
    if (validatedData.length === 0) return

    setIsImporting(true)
    setImportError(null)
    setImportResult(null)
    
    try {
      const response = await fetch('/api/merchant/announcements/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          announcements: validatedData
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'import')
      }
      
      const result: ImportResult = await response.json()
      setImportResult(result)
      
      // Recharger l'historique
      await loadImportHistory()
      
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Erreur d\'import')
    } finally {
      setIsImporting(false)
    }
  }, [validatedData])

  // Télécharger un template
  const downloadTemplate = useCallback((templateName: string) => {
    try {
      const csvContent = BulkImportService.generateTemplateCSV(templateName)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `template_${templateName.toLowerCase()}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Erreur téléchargement template:', error)
    }
  }, [])

  // Charger l'historique des imports
  const loadImportHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    
    try {
      const response = await fetch('/api/merchant/announcements/import-history')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique')
      }
      
      const data = await response.json()
      setImportHistory(data.imports)
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Réinitialiser l'import
  const resetImport = useCallback(() => {
    setSelectedFile(null)
    setParsedData([])
    setParsedHeaders([])
    setParseErrors([])
    setValidatedData([])
    setValidationErrors([])
    setImportResult(null)
    setImportError(null)
  }, [])

  // Propriétés calculées
  const canProceedToValidation = parsedData.length > 0 && parseErrors.length === 0
  const canProceedToImport = validatedData.length > 0 && !isImporting
  const hasErrors = parseErrors.length > 0 || validationErrors.length > 0
  const totalRows = parsedData.length
  const validRows = validatedData.length
  const errorRows = validationErrors.length

  return {
    // État du fichier
    selectedFile,
    setSelectedFile,
    
    // État du parsing
    parsedData,
    parsedHeaders,
    parseErrors,
    isParsing,
    
    // État de validation
    validatedData,
    validationErrors,
    isValidating,
    
    // État d'import
    importResult,
    isImporting,
    importError,
    
    // Historique
    importHistory,
    historyLoading,
    historyError,
    
    // Templates
    templates,
    selectedTemplate,
    setSelectedTemplate,
    
    // Actions
    parseFile,
    validateData,
    importData,
    downloadTemplate,
    loadImportHistory,
    resetImport,
    
    // Utilitaires
    canProceedToValidation,
    canProceedToImport,
    hasErrors,
    totalRows,
    validRows,
    errorRows
  }
}

// Hook pour gérer le drag & drop de fichiers
export function useFileDropzone() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragError, setDragError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
    setDragError(null)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, onFileSelect: (file: File) => void) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragError(null)

    const files = Array.from(e.dataTransfer.files)
    
    if (files.length === 0) {
      setDragError('Aucun fichier détecté')
      return
    }

    if (files.length > 1) {
      setDragError('Un seul fichier autorisé')
      return
    }

    const file = files[0]
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      setDragError('Type de fichier non supporté (CSV ou Excel uniquement)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setDragError('Fichier trop volumineux (max 10MB)')
      return
    }

    onFileSelect(file)
  }, [])

  return {
    isDragOver,
    dragError,
    setDragError,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}

// Hook pour la prévisualisation des données
export function useDataPreview(data: any[], maxRows: number = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(maxRows)

  const totalPages = Math.ceil(data.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const currentData = data.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)

  return {
    currentData,
    currentPage,
    totalPages,
    rowsPerPage,
    totalRows: data.length,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  }
} 