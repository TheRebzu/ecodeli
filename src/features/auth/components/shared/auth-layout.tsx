'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Leaf, User, Truck, Store, Settings, Shield } from 'lucide-react'
import { Role } from '@/lib/auth/config'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  description: string
  role?: Role
  showRoleBadge?: boolean
}

const roleConfig = {
  CLIENT: {
    icon: User,
    label: 'Client',
    color: 'bg-blue-500',
    description: 'Accès aux services de livraison'
  },
  DELIVERER: {
    icon: Truck,
    label: 'Livreur',
    color: 'bg-green-500',
    description: 'Livraisons et trajets'
  },
  MERCHANT: {
    icon: Store,
    label: 'Commerçant',
    color: 'bg-purple-500',
    description: 'Gestion des ventes'
  },
  PROVIDER: {
    icon: Settings,
    label: 'Prestataire',
    color: 'bg-orange-500',
    description: 'Services à la personne'
  },
  ADMIN: {
    icon: Shield,
    label: 'Administrateur',
    color: 'bg-red-500',
    description: 'Gestion de la plateforme'
  }
}

/**
 * Layout unifié pour toutes les pages d'authentification
 * Design cohérent avec l'identité EcoDeli
 */
export function AuthLayout({ 
  children, 
  title, 
  description, 
  role,
  showRoleBadge = true 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Header EcoDeli */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">EcoDeli</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Plateforme de crowdshipping écologique
          </p>
        </div>

        {/* Card principale */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="mt-1">
                  {description}
                </CardDescription>
              </div>
              
              {/* Badge de rôle */}
              {role && showRoleBadge && (
                <RoleBadge role={role} />
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {children}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>
            © 2024 EcoDeli - Livraisons écologiques et services à la personne
          </p>
          <div className="flex justify-center space-x-4 mt-2">
            <a href="/legal/terms" className="hover:text-gray-700">
              Conditions
            </a>
            <a href="/legal/privacy" className="hover:text-gray-700">
              Confidentialité
            </a>
            <a href="/support" className="hover:text-gray-700">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const config = roleConfig[role]
  const Icon = config.icon

  return (
    <Badge 
      variant="secondary" 
      className={`${config.color} text-white border-0`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}