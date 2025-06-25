"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function TestAuthPage() {
  const [email, setEmail] = useState("celian@celian-vf.fr")
  const [password, setPassword] = useState("password123")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult("")

    try {
      const response = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ SUCCÈS!\nUtilisateur: ${data.user.email}\nRôle: ${data.user.role}\nID: ${data.user.id}`)
      } else {
        setResult(`❌ ÉCHEC!\nErreur: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ ERREUR!\nMessage: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogout = async () => {
    setLoading(true)
    setResult("")

    try {
      const response = await fetch("/api/auth/simple-logout", {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ DÉCONNEXION RÉUSSIE!\nMessage: ${data.message}`)
      } else {
        setResult(`❌ ÉCHEC DÉCONNEXION!\nErreur: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ ERREUR DÉCONNEXION!\nMessage: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const testMe = async () => {
    setLoading(true)
    setResult("")

    try {
      const response = await fetch("/api/auth/me")
      const data = await response.json()

      if (response.ok) {
        setResult(`✅ UTILISATEUR RÉCUPÉRÉ!\nEmail: ${data.user.email}\nRôle: ${data.user.role}`)
      } else {
        setResult(`❌ NON CONNECTÉ!\nErreur: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ ERREUR!\nMessage: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          🧪 Test Authentification EcoDeli JWT
        </h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test de Connexion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
              />
            </div>

            <div className="flex gap-4">
              <Button onClick={testLogin} disabled={loading} className="flex-1">
                {loading ? "Test en cours..." : "🔐 Test Connexion"}
              </Button>
              <Button onClick={testMe} disabled={loading} variant="outline">
                👤 Test Session
              </Button>
              <Button onClick={testLogout} disabled={loading} variant="destructive">
                🚪 Test Déconnexion
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Résultat du Test</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md text-sm">
                {result}
              </pre>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>🏠 <a href="/fr/login" className="text-blue-600 hover:underline">Aller à la page de login</a></p>
          <p>👤 <a href="/fr/client" className="text-blue-600 hover:underline">Aller au dashboard client</a></p>
        </div>
      </div>
    </div>
  )
} 