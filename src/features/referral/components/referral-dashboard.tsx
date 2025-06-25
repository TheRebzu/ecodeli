'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Copy, Share2, Gift, Users, TrendingUp, Link, Trophy, Star, Mail, MessageSquare } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingRewards: number
  level: number
  nextLevelReferrals: number
  conversionRate: number
}

interface ReferralCode {
  id: string
  code: string
  usageCount: number
  maxUsage: number
  expiresAt: Date | null
  isActive: boolean
  earnings: number
}

interface ReferralActivity {
  id: string
  type: string
  description: string
  amount: number
  createdAt: Date
  referredUser?: {
    name: string
    email: string
  }
}

export default function ReferralDashboard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [activities, setActivities] = useState<ReferralActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [shareMessage, setShareMessage] = useState('')

  useEffect(() => {
    loadReferralData()
  }, [])

  const loadReferralData = async () => {
    try {
      setLoading(true)
      
      // Charger les statistiques
      const statsResponse = await fetch('/api/referral/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Charger les codes
      const codesResponse = await fetch('/api/referral/codes')
      if (codesResponse.ok) {
        const codesData = await codesResponse.json()
        setCodes(codesData.codes || [])
      }

      // Charger l'activité
      const activityResponse = await fetch('/api/referral/activity')
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setActivities(activityData.activities || [])
      }

    } catch (error) {
      console.error('Erreur chargement données parrainage:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données de parrainage',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateReferralCode = async () => {
    try {
      const response = await fetch('/api/referral/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PERSONAL',
          maxUsage: 100
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCodes(prev => [data.code, ...prev])
        toast({
          title: 'Code créé',
          description: `Votre nouveau code ${data.code.code} est prêt !`
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le code de parrainage',
        variant: 'destructive'
      })
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: 'Code copié',
      description: 'Le code de parrainage a été copié dans le presse-papiers'
    })
  }

  const shareCode = async (code: string) => {
    const referralUrl = `${window.location.origin}/register?ref=${code}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoignez EcoDeli avec mon code de parrainage',
          text: shareMessage || 'Découvrez EcoDeli, la plateforme de livraison écologique !',
          url: referralUrl
        })
      } catch (error) {
        copyCode(referralUrl)
      }
    } else {
      copyCode(referralUrl)
    }
  }

  const sendEmailInvite = (code: string) => {
    const subject = 'Découvrez EcoDeli avec mon code de parrainage'
    const body = `Salut !

Je t'invite à découvrir EcoDeli, une plateforme de livraison écologique qui révolutionne le transport urbain.

Utilise mon code de parrainage "${code}" lors de ton inscription et profite d'un bonus de bienvenue !

👉 Inscris-toi ici : ${window.location.origin}/register?ref=${code}

À bientôt sur EcoDeli ! 🌱`

    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const levelProgress = stats ? 
    ((stats.totalReferrals % stats.nextLevelReferrals) / stats.nextLevelReferrals) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Programme de Parrainage</h1>
          <p className="text-muted-foreground">Invitez vos amis et gagnez des récompenses</p>
        </div>
        <Button onClick={generateReferralCode} className="bg-green-600 hover:bg-green-700">
          <Gift className="w-4 h-4 mr-2" />
          Nouveau Code
        </Button>
      </div>

      {/* Statistiques principales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Parrainages</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
              <Badge variant="secondary" className="mt-1">
                {stats.activeReferrals} actifs
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gains Totaux</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalEarnings.toFixed(2)}€
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingRewards.toFixed(2)}€ en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Niveau Actuel</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">Niveau {stats.level}</div>
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
              </div>
              <div className="mt-2">
                <Progress value={levelProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.nextLevelReferrals - (stats.totalReferrals % stats.nextLevelReferrals)} parrainages pour le niveau suivant
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Invitations transformées
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes">Mes Codes</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
          <TabsTrigger value="share">Partager</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vos Codes de Parrainage</CardTitle>
              <CardDescription>
                Partagez ces codes avec vos amis pour gagner des récompenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {codes.map((codeItem) => (
                  <div key={codeItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                          {codeItem.code}
                        </code>
                        <Badge variant={codeItem.isActive ? 'default' : 'secondary'}>
                          {codeItem.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Utilisations: {codeItem.usageCount}/{codeItem.maxUsage}</span>
                        <span>Gains: {codeItem.earnings.toFixed(2)}€</span>
                        {codeItem.expiresAt && (
                          <span>Expire le: {new Date(codeItem.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCode(codeItem.code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareCode(codeItem.code)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendEmailInvite(codeItem.code)}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {codes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Vous n'avez pas encore de code de parrainage</p>
                    <Button onClick={generateReferralCode} className="mt-4">
                      Créer mon premier code
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activité Récente</CardTitle>
              <CardDescription>
                Historique de vos parrainages et récompenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {activity.referredUser && (
                        <p className="text-sm text-muted-foreground">
                          Utilisateur: {activity.referredUser.name}
                        </p>
                      )}
                    </div>
                    {activity.amount > 0 && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        +{activity.amount.toFixed(2)}€
                      </Badge>
                    )}
                  </div>
                ))}

                {activities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune activité récente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partagez et Invitez</CardTitle>
              <CardDescription>
                Personnalisez votre message d'invitation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shareMessage">Message personnalisé</Label>
                <textarea
                  id="shareMessage"
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={4}
                  placeholder="Découvrez EcoDeli, la plateforme de livraison écologique qui révolutionne le transport urbain..."
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Moyens de partage rapide</h3>
                
                {codes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex-col items-start"
                      onClick={() => shareCode(codes[0].code)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 className="w-5 h-5" />
                        <span className="font-medium">Partage natif</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">
                        Utilisez les options de partage de votre appareil
                      </p>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex-col items-start"
                      onClick={() => sendEmailInvite(codes[0].code)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5" />
                        <span className="font-medium">Email</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">
                        Envoyez une invitation par email
                      </p>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex-col items-start"
                      onClick={() => copyCode(`${window.location.origin}/register?ref=${codes[0].code}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Link className="w-5 h-5" />
                        <span className="font-medium">Lien d'invitation</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">
                        Copiez le lien d'inscription personnalisé
                      </p>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex-col items-start"
                      onClick={() => copyCode(codes[0].code)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Copy className="w-5 h-5" />
                        <span className="font-medium">Code seul</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">
                        Copiez uniquement le code de parrainage
                      </p>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}