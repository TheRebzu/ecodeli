"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Globe, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Clock,
  Activity
} from "lucide-react"

interface ApiTestResult {
  endpoint: string
  method: string
  success: boolean
  statusCode: number
  responseTime: number
  message: string
  timestamp: string
  response?: any
}

export function ApiTests() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("health")
  const [customUrl, setCustomUrl] = useState("")
  const [customMethod, setCustomMethod] = useState("GET")
  const [customBody, setCustomBody] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ApiTestResult[]>([])

  const predefinedEndpoints = [
    { value: "health", label: "Health Check", method: "GET", description: "Vérification de l'état du serveur" },
    { value: "auth-me", label: "Auth - Me", method: "GET", description: "Informations utilisateur connecté" },
    { value: "users", label: "Utilisateurs", method: "GET", description: "Liste des utilisateurs" },
    { value: "announcements", label: "Annonces", method: "GET", description: "Liste des annonces" },
    { value: "deliveries", label: "Livraisons", method: "GET", description: "Liste des livraisons" },
    { value: "payments", label: "Paiements", method: "GET", description: "Liste des paiements" },
    { value: "settings", label: "Paramètres", method: "GET", description: "Paramètres système" },
    { value: "admin-dashboard", label: "Dashboard Admin", method: "GET", description: "Statistiques admin" },
    { value: "admin-users", label: "Admin - Utilisateurs", method: "GET", description: "Gestion utilisateurs admin" },
    { value: "admin-verifications", label: "Admin - Vérifications", method: "GET", description: "Vérifications admin" }
  ]

  const getEndpointUrl = (endpoint: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    
    const endpointMap: Record<string, string> = {
      "health": "/api/health",
      "auth-me": "/api/auth/me",
      "users": "/api/admin/users",
      "announcements": "/api/admin/announcements",
      "deliveries": "/api/admin/deliveries",
      "payments": "/api/admin/payments",
      "settings": "/api/admin/settings",
      "admin-dashboard": "/api/admin/dashboard",
      "admin-users": "/api/admin/users",
      "admin-verifications": "/api/admin/verifications"
    }

    return `${baseUrl}${endpointMap[endpoint] || endpoint}`
  }

  const runApiTest = async (endpoint: string, method: string, body?: string) => {
    const startTime = Date.now()
    const url = endpoint.startsWith("http") ? endpoint : getEndpointUrl(endpoint)
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      }

      if (body && method !== 'GET') {
        options.body = body
      }

      const response = await fetch(url, options)
      const responseTime = Date.now() - startTime
      
      let responseData
      try {
        responseData = await response.json()
      } catch {
        responseData = await response.text()
      }

      return {
        endpoint: url,
        method,
        success: response.ok,
        statusCode: response.status,
        responseTime,
        message: response.ok ? "Requête réussie" : `Erreur ${response.status}`,
        timestamp: new Date().toLocaleString(),
        response: responseData
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: url,
        method,
        success: false,
        statusCode: 0,
        responseTime,
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toLocaleString()
      }
    }
  }

  const handleTestPredefinedEndpoint = async () => {
    setIsLoading(true)
    
    const endpoint = predefinedEndpoints.find(ep => ep.value === selectedEndpoint)
    if (!endpoint) return

    const result = await runApiTest(selectedEndpoint, endpoint.method)
    setResults(prev => [result, ...prev])
    setIsLoading(false)
  }

  const handleTestCustomEndpoint = async () => {
    if (!customUrl) {
      setResults(prev => [{
        endpoint: "N/A",
        method: customMethod,
        success: false,
        statusCode: 0,
        responseTime: 0,
        message: "Veuillez saisir une URL",
        timestamp: new Date().toLocaleString()
      }, ...prev])
      return
    }

    setIsLoading(true)
    const result = await runApiTest(customUrl, customMethod, customBody)
    setResults(prev => [result, ...prev])
    setIsLoading(false)
  }

  const handleTestAllEndpoints = async () => {
    setIsLoading(true)
    const newResults: ApiTestResult[] = []

    for (const endpoint of predefinedEndpoints) {
      const result = await runApiTest(endpoint.value, endpoint.method)
      newResults.push(result)
    }

    setResults(prev => [...newResults, ...prev])
    setIsLoading(false)
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="space-y-6">
      {/* Tests prédéfinis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Tests d'APIs Prédéfinies
          </CardTitle>
          <CardDescription>
            Testez les endpoints principaux de l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint à tester</Label>
              <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un endpoint" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedEndpoints.map((endpoint) => (
                    <SelectItem key={endpoint.value} value={endpoint.value}>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                          {endpoint.label}
                        </div>
                        <div className="text-xs text-gray-500">{endpoint.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>URL de l'endpoint</Label>
              <div className="p-2 bg-gray-50 rounded text-sm font-mono">
                {getEndpointUrl(selectedEndpoint)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleTestPredefinedEndpoint} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Tester cet Endpoint
            </Button>
            
            <Button 
              onClick={handleTestAllEndpoints} 
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Tester Tous les Endpoints
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test personnalisé */}
      <Card>
        <CardHeader>
          <CardTitle>Test d'API Personnalisé</CardTitle>
          <CardDescription>
            Testez n'importe quel endpoint avec une requête personnalisée
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-url">URL de l'endpoint</Label>
              <Input
                id="custom-url"
                placeholder="https://api.example.com/endpoint"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-method">Méthode HTTP</Label>
              <Select value={customMethod} onValueChange={setCustomMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {customMethod !== "GET" && (
            <div className="space-y-2">
              <Label htmlFor="custom-body">Corps de la requête (JSON)</Label>
              <Textarea
                id="custom-body"
                placeholder='{"key": "value"}'
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <Button 
            onClick={handleTestCustomEndpoint} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Tester l'Endpoint Personnalisé
          </Button>
        </CardContent>
      </Card>

      {/* Résultats */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats des Tests</CardTitle>
            <CardDescription>
              Historique des tests d'APIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <Alert key={index} variant={result.success ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{result.method}</Badge>
                            <span className="font-mono text-sm">{result.endpoint}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.success ? "secondary" : "destructive"}>
                              {result.statusCode}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {result.responseTime}ms
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm">{result.message}</div>
                        {result.response && (
                          <details className="text-xs">
                            <summary className="cursor-pointer">Voir la réponse</summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                              {JSON.stringify(result.response, null, 2)}
                            </pre>
                          </details>
                        )}
                        <div className="text-xs text-gray-500">{result.timestamp}</div>
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={clearResults}
                size="sm"
              >
                Effacer les résultats
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Informations sur les Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Les tests incluent les cookies d'authentification</p>
            <p>• Les temps de réponse sont mesurés côté client</p>
            <p>• Vérifiez les logs serveur pour plus de détails</p>
            <p>• Certains endpoints peuvent nécessiter des permissions spécifiques</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 