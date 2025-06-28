"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Truck, Store, Wrench, Settings, Copy } from "lucide-react"

const TEST_ACCOUNTS = [
  {
    role: 'CLIENT',
    email: 'client1@test.com',
    password: 'Test123!',
    name: 'Marie Dubois',
    icon: User,
    color: 'bg-blue-500',
    description: 'Accès client avec tutoriel'
  },
  {
    role: 'CLIENT',
    email: 'client2@test.com',
    password: 'Test123!',
    name: 'Jean Martin',
    icon: User,
    color: 'bg-blue-400',
    description: 'Client - Abonnement starter'
  },
  {
    role: 'DELIVERER',
    email: 'livreur1@test.com',
    password: 'Test123!',
    name: 'Thomas Moreau',
    icon: Truck,
    color: 'bg-green-500',
    description: 'Livreur validé'
  },
  {
    role: 'DELIVERER',
    email: 'livreur2@test.com',
    password: 'Test123!',
    name: 'Lucas Simon',
    icon: Truck,
    color: 'bg-green-400',
    description: 'Livreur expérimenté'
  },
  {
    role: 'MERCHANT',
    email: 'commercant1@test.com',
    password: 'Test123!',
    name: 'Carrefour City',
    icon: Store,
    color: 'bg-purple-500',
    description: 'Carrefour City Flandre'
  },
  {
    role: 'MERCHANT',
    email: 'commercant2@test.com',
    password: 'Test123!',
    name: 'Monoprix',
    icon: Store,
    color: 'bg-purple-400',
    description: 'Monoprix République'
  },
  {
    role: 'PROVIDER',
    email: 'prestataire1@test.com',
    password: 'Test123!',
    name: 'Julie Durand',
    icon: Wrench,
    color: 'bg-orange-500',
    description: 'Prestataire validée'
  },
  {
    role: 'PROVIDER',
    email: 'prestataire2@test.com',
    password: 'Test123!',
    name: 'Marc Rousseau',
    icon: Wrench,
    color: 'bg-orange-400',
    description: 'Services à domicile'
  },
  {
    role: 'ADMIN',
    email: 'admin1@test.com',
    password: 'Test123!',
    name: 'Admin Principal',
    icon: Settings,
    color: 'bg-red-500',
    description: 'Administrateur principal'
  },
  {
    role: 'ADMIN',
    email: 'admin2@test.com',
    password: 'Test123!',
    name: 'Admin Support',
    icon: Settings,
    color: 'bg-red-400',
    description: 'Support et assistance'
  }
]

export function TestAccountsWithForm() {
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Ne pas afficher en production
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const fillFormWithAccount = (account: typeof TEST_ACCOUNTS[0]) => {
    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    
    if (emailInput && passwordInput) {
      emailInput.value = account.email
      passwordInput.value = account.password
      
      // Déclencher les événements pour que React détecte les changements
      emailInput.dispatchEvent(new Event('input', { bubbles: true }))
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
      
      console.log('📝 Formulaire rempli avec:', account.email)
    }
  }

  const handleQuickLogin = async (account: typeof TEST_ACCOUNTS[0]) => {
    setLoadingAccount(account.email)
    
    try {
      console.log('🔐 Connexion rapide NextAuth:', account.email)
      
      // Utiliser NextAuth signIn
      const { signIn } = await import('next-auth/react')
      
      const result = await signIn('credentials', {
        email: account.email,
        password: account.password,
        redirect: false
      })

      if (result?.ok && !result?.error) {
        console.log('✅ Connexion NextAuth réussie')
        
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
        console.error('❌ Erreur de connexion NextAuth:', result?.error)
        
        // Si l'utilisateur n'existe pas, essayer de le créer
        if (result?.error === 'CredentialsSignin') {
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
      
      // Préparer les données selon le rôle
      const userData: any = {
        email: account.email,
        password: account.password,
        firstName: account.role === 'ADMIN' ? 'Admin' : account.role.charAt(0) + account.role.slice(1).toLowerCase(),
        lastName: 'Test',
        phone: '0123456789',
        role: account.role,
        address: '123 Rue de Test',
        city: 'Paris',
        postalCode: '75001'
      }

      // Ajouter les champs spécifiques selon le rôle
      if (account.role === 'MERCHANT') {
        userData.companyName = 'Test Company'
        userData.siret = `SIRET_${Date.now()}`
      } else if (account.role === 'PROVIDER') {
        userData.businessName = 'Test Business'
      }
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
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

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      console.log('🚪 Déconnexion en cours...')
      const { signOut } = await import('next-auth/react')
      await signOut({ callbackUrl: '/fr/login' })
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error)
    } finally {
      setIsLoggingOut(false)
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
        {TEST_ACCOUNTS.map((account, index) => {
          const Icon = account.icon
          const isLoading = loadingAccount === account.email
          
          return (
            <div
              key={account.email}
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
                    {account.name && (
                      <span className="text-xs font-medium text-gray-700">
                        {account.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {account.description}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {account.email}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fillFormWithAccount(account)}
                  className="text-xs"
                  title="Remplir le formulaire"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickLogin(account)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </div>
            </div>
          )
        })}
        
        <div className="space-y-2">
          <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
            💡 <strong>Astuce :</strong> Cliquez sur <Copy className="inline h-3 w-3" /> pour remplir le formulaire 
            ou sur "Se connecter" pour une connexion directe.
          </div>
          
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="outline"
            size="sm"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoggingOut ? 'Déconnexion...' : '🚪 Se déconnecter d\'abord'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}