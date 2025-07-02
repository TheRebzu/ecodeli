/**
 * Sidebar de base pour EcoDeli
 * Utilise le composant Sidebar de shadcn/ui avec des améliorations spécifiques à EcoDeli
 */

import { type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuBadge,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { type EcoDeliUser } from '../types/layout.types'

// Types temporaires pour ce composant
interface NavigationItem {
  key: string
  label: string
  href: string
  icon?: any
  category?: string
  badge?: string
  children?: NavigationItem[]
}

interface BaseSidebarProps {
  role: string
  user: EcoDeliUser
  navigationItems: NavigationItem[]
  collapsed?: boolean
  onToggle?: () => void
  className?: string
}

// Configuration des icônes
const getIcon = (iconName?: string) => {
  // Retourne l'icône correspondante - à implémenter selon vos besoins
  return iconName ? <Circle className="h-4 w-4" /> : null
}

export function BaseSidebar({
  role,
  user,
  navigationItems,
  collapsed = false,
  onToggle,
  className
}: BaseSidebarProps) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const isItemActive = (item: NavigationItem) => {
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(key => key !== groupKey)
        : [...prev, groupKey]
    )
  }

  const isGroupExpanded = (groupKey: string) => {
    return expandedGroups.includes(groupKey)
  }

  // Grouper les éléments de navigation
  const groupedItems = navigationItems.reduce((acc, item) => {
    const category = item.category || 'main'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, NavigationItem[]>)

  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="icon"
      className={cn("border-r border-border", className)}
    >
      {/* Header avec logo et info utilisateur */}
      <SidebarHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center space-x-3 px-2 py-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="font-semibold text-foreground truncate">EcoDeli</p>
            <p className="text-xs text-muted-foreground capitalize">
              {role.toLowerCase()}
            </p>
          </div>
        </div>
        
        {/* Info utilisateur condensée */}
        {user && (
          <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center space-x-2 p-2 bg-background rounded-md">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || user.email}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-medium">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <div className="flex items-center space-x-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    user.validationStatus === 'APPROVED' ? "bg-green-500" : 
                    user.validationStatus === 'PENDING' ? "bg-yellow-500" : "bg-gray-400"
                  )} />
                  <span className="text-xs text-muted-foreground">
                    {user.validationStatus === 'APPROVED' ? 'Vérifié' : 
                     user.validationStatus === 'PENDING' ? 'En attente' : 'Non vérifié'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      {/* Navigation principale */}
      <SidebarContent className="p-2">
        {Object.entries(groupedItems).map(([category, items], index) => (
          <div key={category}>
            {index > 0 && <SidebarSeparator />}
            
            <SidebarGroup>
              {category !== 'main' && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </SidebarGroupLabel>
              )}
              
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <NavigationMenuItem 
                      key={item.key} 
                      item={item} 
                      isActive={isItemActive(item)}
                      isExpanded={isGroupExpanded(item.key)}
                      onToggle={() => toggleGroup(item.key)}
                      pathname={pathname}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      {/* Footer avec version et support */}
      <SidebarFooter className="border-t border-border bg-muted/30 p-2">
        <div className="group-data-[collapsible=icon]:hidden space-y-2">
          <div className="text-xs text-muted-foreground text-center">
            <p>EcoDeli v1.0.0</p>
            <Link 
              href="/support" 
              className="text-primary hover:underline"
            >
              Support
            </Link>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

/**
 * Élément de navigation individuel
 */
function NavigationMenuItem({
  item,
  isActive,
  isExpanded,
  onToggle,
  pathname
}: {
  item: any
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  pathname: string
}) {
  const hasChildren = item.children && item.children.length > 0

  return (
    <SidebarMenuItem>
      {hasChildren ? (
        <>
          {/* Élément parent avec sous-éléments */}
          <SidebarMenuButton
            onClick={onToggle}
            isActive={isActive}
            className="group/menu-item"
          >
            {getIcon(item.icon)}
            <span className="flex-1">{item.label}</span>
            
            {/* Badge de notification */}
            {item.badge && (
              <SidebarMenuBadge>
                {item.badge}
              </SidebarMenuBadge>
            )}
            
            {/* Icône d'expansion */}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform" />
            )}
          </SidebarMenuButton>

          {/* Sous-menu */}
          {isExpanded && item.children && (
            <SidebarMenuSub>
              {item.children.map((child: NavigationItem) => (
                <SidebarMenuSubItem key={child.key}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === child.href}
                  >
                    <Link href={child.href}>
                      {getIcon(child.icon)}
                      <span>{child.label}</span>
                      {child.badge && (
                        <span className="ml-auto bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </>
      ) : (
        <>
          {/* Élément simple */}
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.label}
          >
            <Link href={item.href}>
              {getIcon(item.icon)}
              <span>{item.label}</span>
              {item.badge && (
                <SidebarMenuBadge>
                  {item.badge}
                </SidebarMenuBadge>
              )}
            </Link>
          </SidebarMenuButton>
        </>
      )}
    </SidebarMenuItem>
  )
}

/**
 * Sidebar vide pour les états de chargement
 */
export function SidebarSkeleton() {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center space-x-3 px-2 py-3">
          <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
          <div className="flex-1 space-y-1 group-data-[collapsible=icon]:hidden">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from({ length: 6 }).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <div className="flex items-center space-x-2 p-2">
                    <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded flex-1 animate-pulse" />
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}