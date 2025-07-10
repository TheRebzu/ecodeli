"use client"

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  UploadIcon, 
  DownloadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  FileTextIcon,
  RefreshCwIcon,
  PlayIcon,
  PauseIcon,
  InfoIcon
} from 'lucide-react'

interface ImportHistory {
  id: string
  filename: string
  status: string
  totalRows: number
  processedRows: number
  successfulRows: number
  errorRows: number
  createdAt: string
  completedAt?: string
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}

interface ImportPreview {
  headers: string[]
  mappings: { [key: string]: string }
  sampleData: any[]
  isValid: boolean
  errors: string[]
}

export default function BulkImportPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [currentImportId, setCurrentImportId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Charger l'historique au montage
  useEffect(() => {
    loadImportHistory()
  }, [])

  // Mapping des colonnes disponibles
  const availableFields = [
    { value: 'title', label: 'Titre' },
    { value: 'description', label: 'Description' },
    { value: 'type', label: 'Type' },
    { value: 'price', label: 'Prix' },
    { value: 'pickupAddress', label: 'Adresse de récupération' },
    { value: 'deliveryAddress', label: 'Adresse de livraison' },
    { value: 'scheduledAt', label: 'Date programmée' },
    { value: 'maxWeight', label: 'Poids maximum' },
    { value: 'maxDimensions', label: 'Dimensions maximales' },
    { value: 'specialInstructions', label: 'Instructions spéciales' },
    { value: 'category', label: 'Catégorie' },
    { value: 'tags', label: 'Tags' }
  ]

  const announcementTypes = [
    { value: 'PACKAGE_DELIVERY', label: 'Livraison de colis' },
    { value: 'PERSON_TRANSPORT', label: 'Transport de personnes' },
    { value: 'AIRPORT_TRANSFER', label: 'Transfert aéroport' },
    { value: 'SHOPPING', label: 'Courses' },
    { value: 'CART_DROP', label: 'Lâcher de chariot' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      analyzeFile(file)
    }
  }

  const analyzeFile = async (file: File) => {
    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/merchant/announcements/bulk-import/analyze', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Erreur lors de l\'analyse du fichier')
      
      const result = await response.json()
      
      // Adapter la réponse de l'API au format attendu par le composant
      const previewData: ImportPreview = {
        headers: ['title', 'description', 'type', 'basePrice', 'pickupAddress', 'deliveryAddress'], // En-têtes par défaut
        mappings: {},
        sampleData: [],
        isValid: result.analysis?.canProceed || false,
        errors: result.analysis?.recommendations || []
      }
      
      setPreview(previewData)
      
    } catch (error) {
      console.error('Erreur analyse fichier:', error)
      alert('Erreur lors de l\'analyse du fichier')
      // Créer un preview par défaut en cas d'erreur
      setPreview({
        headers: [],
        mappings: {},
        sampleData: [],
        isValid: false,
        errors: ['Erreur lors de l\'analyse du fichier']
      })
    } finally {
      setUploading(false)
    }
  }

  const updateMapping = (header: string, field: string) => {
    if (!preview) return
    
    // Si "unmapped" est sélectionné, supprimer le mapping
    const newMappings = { ...preview.mappings }
    if (field === 'unmapped') {
      delete newMappings[header]
    } else {
      newMappings[header] = field
    }
    
    setPreview({
      ...preview,
      mappings: newMappings
    })
  }

  const validateMappings = (): boolean => {
    if (!preview) return false
    
    const requiredFields = ['title', 'description', 'type', 'price']
    const mappedFields = Object.values(preview.mappings).filter(field => field !== 'unmapped')
    
    return requiredFields.every(field => mappedFields.includes(field))
  }

  const startImport = async () => {
    if (!selectedFile || !preview || !validateMappings()) {
      alert('Veuillez corriger les erreurs avant de continuer')
      return
    }

    try {
      setProcessing(true)
      
      // Filtrer les mappings pour exclure les champs "unmapped"
      const validMappings = Object.fromEntries(
        Object.entries(preview.mappings).filter(([_, field]) => field !== 'unmapped')
      )
      
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mappings', JSON.stringify(validMappings))
      
      const response = await fetch('/api/merchant/announcements/bulk-import/process', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Erreur lors du démarrage de l\'import')
      
      const result = await response.json()
      setCurrentImportId(result.importId)
      
      // Démarrer le suivi du progress
      startProgressTracking(result.importId)
      
    } catch (error) {
      console.error('Erreur import:', error)
      alert('Erreur lors du démarrage de l\'import')
      setProcessing(false)
    }
  }

  const startProgressTracking = (importId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/merchant/announcements/bulk-import/${importId}/status`)
        if (!response.ok) throw new Error('Erreur suivi progress')
        
        const status = await response.json()
        setProgress((status.processedRows / status.totalRows) * 100)
        
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          clearInterval(interval)
          setProcessing(false)
          setCurrentImportId(null)
          loadImportHistory()
          
          if (status.status === 'COMPLETED') {
            alert(`Import terminé avec succès! ${status.successfulRows} annonces créées.`)
          } else {
            alert('Import échoué. Consultez l\'historique pour plus de détails.')
          }
        }
        
      } catch (error) {
        clearInterval(interval)
        setProcessing(false)
        console.error('Erreur suivi progress:', error)
      }
    }, 2000)
  }

  const loadImportHistory = async () => {
    try {
      const response = await fetch('/api/merchant/announcements/bulk-import/history')
      if (response.ok) {
        const history = await response.json()
        setImportHistory(history.imports || [])
      } else {
        setImportHistory([])
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error)
      setImportHistory([])
    }
  }

  const downloadTemplate = () => {
    // Créer un template CSV
    const headers = [
      'titre',
      'description', 
      'type',
      'prix',
      'adresse_recuperation',
      'adresse_livraison',
      'date_programmee',
      'poids_max',
      'dimensions_max',
      'instructions'
    ]
    
    const sampleData = [
      'Livraison urgent documents',
      'Besoin de livrer des documents importants dans les 24h',
      'PACKAGE_DELIVERY',
      '25.00',
      '75001 Paris',
      '75016 Paris',
      '2024-12-31T14:00:00Z',
      '2',
      '30x20x10',
      'Fragile - manipuler avec précaution'
    ]
    
    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-import-annonces.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Échoué</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <UploadIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Import en masse</h1>
          <p className="text-muted-foreground">
            Importez plusieurs annonces à la fois via fichier CSV/Excel
          </p>
        </div>
      </div>

      {/* Info et template */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Utilisez notre template CSV pour structurer vos données correctement.
          <Button 
            variant="link" 
            className="p-0 h-auto font-normal ml-2"
            onClick={downloadTemplate}
          >
            <DownloadIcon className="h-4 w-4 mr-1" />
            Télécharger le template
          </Button>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Nouvel import</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {/* Nouvel import */}
        <TabsContent value="import">
          <div className="space-y-6">
            {/* Upload fichier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5" />
                  Sélection du fichier
                </CardTitle>
                <CardDescription>
                  Formats supportés : CSV, Excel (.xlsx, .xls)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileTextIcon className="h-12 w-12 mx-auto text-green-500" />
                        <div className="font-medium">{selectedFile.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Changer de fichier
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div className="font-medium">Glisser-déposer ou cliquer pour sélectionner</div>
                        <Button onClick={() => fileInputRef.current?.click()}>
                          Sélectionner un fichier
                        </Button>
                      </div>
                    )}
                  </div>

                  {uploading && (
                    <div className="text-center">
                      <RefreshCwIcon className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">
                        Analyse du fichier en cours...
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview et mapping */}
            {preview && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuration des colonnes</CardTitle>
                  <CardDescription>
                    Associez les colonnes de votre fichier aux champs EcoDeli
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Erreurs de validation */}
                  {preview.errors && preview.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircleIcon className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Erreurs détectées :</div>
                        <ul className="list-disc list-inside space-y-1">
                          {preview.errors.map((error, index) => (
                            <li key={index} className="text-sm">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Mapping des colonnes */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Mapping des colonnes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {preview.headers && preview.headers.map((header, index) => (
                        <div key={index} className="space-y-2">
                          <Label className="text-sm">
                            Colonne : <span className="font-mono bg-gray-100 px-1 rounded">{header}</span>
                          </Label>
                          <Select
                            value={preview.mappings[header] || 'unmapped'}
                            onValueChange={(value) => updateMapping(header, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un champ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">Non mappé</SelectItem>
                              {availableFields.map(field => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aperçu des données */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Aperçu des données</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {preview.headers && preview.headers.map((header, index) => (
                              <TableHead key={index}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.sampleData && preview.sampleData.slice(0, 3).map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {preview.headers && preview.headers.map((header, cellIndex) => (
                                <TableCell key={cellIndex} className="max-w-32 truncate">
                                  {row[header] || '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-4">
                    <Button 
                      onClick={startImport}
                      disabled={!validateMappings() || processing}
                      className="flex items-center gap-2"
                    >
                      {processing ? (
                        <RefreshCwIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayIcon className="h-4 w-4" />
                      )}
                      {processing ? 'Import en cours...' : 'Démarrer l\'import'}
                    </Button>
                    
                    {!validateMappings() && (
                      <Alert className="flex-1">
                        <AlertCircleIcon className="h-4 w-4" />
                        <AlertDescription>
                          Les champs obligatoires (titre, description, type, prix) doivent être mappés.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Progress */}
                  {processing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression de l'import</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCwIcon className="h-5 w-5" />
                Historique des imports
              </CardTitle>
              <CardDescription>
                Consultez le statut et les résultats de vos imports précédents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importHistory && importHistory.length > 0 ? (
                <div className="space-y-4">
                  {importHistory.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.filename}</span>
                            {getStatusBadge(item.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Total</div>
                              <div className="font-medium">{item.totalRows} lignes</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Succès</div>
                              <div className="font-medium text-green-600">{item.successfulRows}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Erreurs</div>
                              <div className="font-medium text-red-600">{item.errorRows}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Progress</div>
                              <div className="font-medium">
                                {Math.round((item.processedRows / item.totalRows) * 100)}%
                              </div>
                            </div>
                          </div>

                          {item.errors && item.errors.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm text-red-600">
                                Voir les erreurs ({item.errors.length})
                              </summary>
                              <div className="mt-2 space-y-1 text-sm">
                                {item.errors.slice(0, 5).map((error, index) => (
                                  <div key={index} className="text-red-600">
                                    Ligne {error.row}, champ {error.field}: {error.message}
                                  </div>
                                ))}
                                {item.errors.length > 5 && (
                                  <div className="text-muted-foreground">
                                    ... et {item.errors.length - 5} autres erreurs
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>

                        <div className="text-right text-sm text-muted-foreground">
                          <div>Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}</div>
                          {item.completedAt && (
                            <div>Terminé le {new Date(item.completedAt).toLocaleDateString('fr-FR')}</div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun import réalisé pour le moment
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 