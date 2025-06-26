'use client'

import { useState } from 'react'
import { useAuthBetter } from '@/features/auth/hooks/useAuthBetter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UserRole } from '@/lib/auth-client'

export function BetterAuthTest() {
  const auth = useAuthBetter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('CLIENT')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password || !name) return
    
    setLoading(true)
    try {
      await auth.register({ email, password, name, role })
    } catch (error) {
      console.error('Erreur inscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) return
    
    setLoading(true)
    try {
      await auth.login(email, password)
    } catch (error) {
      console.error('Erreur connexion:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      await auth.logout()
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Better-Auth EcoDeli</CardTitle>
          <CardDescription>
            Interface de test pour l'authentification Better-Auth
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statut utilisateur */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Statut Utilisateur</h3>
            {auth.isLoading ? (
              <Badge variant="secondary">Chargement...</Badge>
            ) : auth.isAuthenticated ? (
              <div className="space-y-2">
                <Badge variant="default">Connecté</Badge>
                <p><strong>Email:</strong> {auth.user?.email}</p>
                <p><strong>Nom:</strong> {auth.user?.name}</p>
                <p><strong>Rôle:</strong> {auth.user?.role}</p>
                <p><strong>Actif:</strong> {auth.isActive ? '✅' : '❌'}</p>
                <p><strong>Statut:</strong> {auth.validationStatus}</p>
                <p><strong>Email vérifié:</strong> {auth.user?.emailVerified ? '✅' : '❌'}</p>
              </div>
            ) : (
              <Badge variant="destructive">Non connecté</Badge>
            )}
          </div>

          {/* Formulaires d'authentification */}
          {!auth.isAuthenticated && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="DELIVERER">Livreur</SelectItem>
                    <SelectItem value="MERCHANT">Commerçant</SelectItem>
                    <SelectItem value="PROVIDER">Prestataire</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleRegister}
                  disabled={loading || !email || !password || !name}
                  variant="default"
                >
                  {loading ? 'Inscription...' : 'S\'inscrire'}
                </Button>
                <Button 
                  onClick={handleLogin}
                  disabled={loading || !email || !password}
                  variant="outline"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </div>
            </div>
          )}

          {/* Actions utilisateur connecté */}
          {auth.isAuthenticated && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={handleLogout}
                  disabled={loading}
                  variant="destructive"
                >
                  {loading ? 'Déconnexion...' : 'Se déconnecter'}
                </Button>
                <Button 
                  onClick={auth.redirectToRole}
                  variant="default"
                >
                  Aller au Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* Indicateurs de rôle */}
          {auth.isAuthenticated && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-semibold">Permissions</h3>
              <div className="flex gap-2 flex-wrap">
                {auth.isAdmin && <Badge variant="destructive">Admin</Badge>}
                {auth.isClient && <Badge variant="default">Client</Badge>}
                {auth.isDeliverer && <Badge variant="secondary">Livreur</Badge>}
                {auth.isMerchant && <Badge variant="outline">Commerçant</Badge>}
                {auth.isProvider && <Badge variant="secondary">Prestataire</Badge>}
              </div>
            </div>
          )}

          {/* Erreurs */}
          {auth.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{auth.error.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comptes de test prédéfinis */}
      <Card>
        <CardHeader>
          <CardTitle>Comptes de Test</CardTitle>
          <CardDescription>
            Utilisez ces comptes pour tester rapidement chaque rôle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { role: 'CLIENT', email: 'client@test.com', name: 'Client Test' },
              { role: 'DELIVERER', email: 'deliverer@test.com', name: 'Livreur Test' },
              { role: 'MERCHANT', email: 'merchant@test.com', name: 'Commerçant Test' },
              { role: 'PROVIDER', email: 'provider@test.com', name: 'Prestataire Test' },
              { role: 'ADMIN', email: 'admin@test.com', name: 'Admin Test' },
            ].map((account) => (
              <Card key={account.role} className="p-4">
                <h4 className="font-semibold">{account.role}</h4>
                <p className="text-sm text-gray-600">{account.email}</p>
                <p className="text-sm text-gray-600">Test123!</p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword('Test123!')
                    setName(account.name)
                    setRole(account.role as UserRole)
                  }}
                >
                  Utiliser ce compte
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}