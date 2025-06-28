"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Truck, Store, Wrench, Settings } from "lucide-react"

const TEST_ACCOUNTS = [
  {
    role: 'CLIENT',
    email: 'client-complete@test.com',
    password: 'Test123!',
    icon: User,
    color: 'bg-blue-500',
    description: 'Accès client avec tutoriel'
  },
  {
    role: 'DELIVERER',
    email: 'deliverer-complete@test.com',
    password: 'Test123!',
    icon: Truck,
    color: 'bg-green-500',
    description: 'Livreur (documents à valider)'
  },
  {
    role: 'MERCHANT',
    email: 'merchant-complete@test.com',
    password: 'Test123!',
    icon: Store,
    color: 'bg-purple-500',
    description: 'Commerçant (contrat à signer)'
  },
  {
    role: 'PROVIDER',
    email: 'provider-complete@test.com',
    password: 'Test123!',
    icon: Wrench,
    color: 'bg-orange-500',
    description: 'Prestataire (profil à valider)'
  },
  {
    role: 'ADMIN',
    email: 'admin-complete@test.com',
    password: 'Test123!',
    icon: Settings,
    color: 'bg-red-500',
    description: 'Administrateur (toutes permissions)'
  }
]

interface TestAccountsProps {
  onAccountSelect?: (email: string, password: string) => void
}

export function TestAccounts({ onAccountSelect }: TestAccountsProps) {
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null)

  // Ne pas afficher en production
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const handleQuickLogin = async (account: typeof TEST_ACCOUNTS[0]) => {
    setLoadingAccount(account.role)
    
    try {
      console.log('🔐 Connexion rapide:', account.email)
      
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: account.email,
          password: account.password
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Connexion réussie:', result)
        
        // Redirection selon le rôle avec locale
        const locale = window.location.pathname.split('/')[1] || 'fr'
        const roleRoutes = {
          'CLIENT': `/${locale}/client`,
          'DELIVERER': `/${locale}/deliverer`,
          'MERCHANT': `/${locale}/merchant`,
          'PROVIDER': `/${locale}/provider`,
          'ADMIN': `/${locale}/admin`
        }
        
        window.location.href = roleRoutes[account.role as keyof typeof roleRoutes] || `/${locale}/client`
      } else {
        const errorData = await response.json()
        console.error('❌ Erreur de connexion:', errorData)
        
        // Si l'utilisateur n'existe pas, essayer de le créer
        if (response.status === 401) {
          console.log('🌱 Utilisateur introuvable, création en cours...')
          await createTestUser(account)
        }
      }
    } catch (error) {
      console.error('❌ Erreur:', error)
    } finally {
      setLoadingAccount(null)
    }
  }

  const createTestUser = async (account: typeof TEST_ACCOUNTS[0]) => {
    try {
      console.log('🌱 Création utilisateur:', account.email)
      
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: account.email,
          password: account.password,
          name: `${account.role} Test`,
          role: account.role,
          isActive: true,
          validationStatus: 'VALIDATED'
        })
      })

      if (response.ok) {
        console.log('✅ Utilisateur créé, connexion automatique...')
        // Essayer de se connecter après création
        await handleQuickLogin(account)
      } else {
        const errorData = await response.json()
        console.error('❌ Erreur création utilisateur:', errorData)
      }
    } catch (error) {
      console.error('❌ Erreur création:', error)
    }
  }

  const handleAccountSelect = (account: typeof TEST_ACCOUNTS[0]) => {
    if (onAccountSelect) {
      onAccountSelect(account.email, account.password)
    } else {
      handleQuickLogin(account)
    }
  }

  return (
    <Card className="mt-6 border-dashed border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
          🧪 Comptes de test - Mode développement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {TEST_ACCOUNTS.map((account) => {
          const Icon = account.icon
          const isLoading = loadingAccount === account.role
          
          return (
            <div
              key={account.role}
              className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${account.color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {account.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {account.description}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {account.email}
                  </p>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAccountSelect(account)}
                disabled={isLoading}
                className="text-xs"
              >
                {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </div>
          )
        })}
        
        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          💡 <strong>Astuce :</strong> Cliquez sur "Se connecter" pour une connexion rapide, 
          ou copiez les identifiants dans le formulaire principal.
        </div>
      </CardContent>
    </Card>
  )
} 