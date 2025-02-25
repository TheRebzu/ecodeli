"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LayoutDashboard, Package, ShoppingBag, FileText, Settings, Truck, Store, Briefcase } from "lucide-react"
import type { UserRole } from "@/types/auth"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  user: { role?: UserRole } | null
}

const menuItems = {
  CUSTOMER: [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "/customer/dashboard" },
    { icon: Package, label: "Livraisons", href: "/customer/deliveries" },
    { icon: ShoppingBag, label: "Commandes", href: "/customer/orders" },
    { icon: FileText, label: "Factures", href: "/customer/invoices" },
  ],
  COURIER: [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "/courier/dashboard" },
    { icon: Truck, label: "Mes livraisons", href: "/courier/deliveries" },
    { icon: FileText, label: "Mes gains", href: "/courier/earnings" },
  ],
  MERCHANT: [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "/merchant/dashboard" },
    { icon: Store, label: "Mes produits", href: "/merchant/products" },
    { icon: ShoppingBag, label: "Commandes reçues", href: "/merchant/orders" },
  ],
  PROVIDER: [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "/provider/dashboard" },
    { icon: Briefcase, label: "Mes services", href: "/provider/services" },
    { icon: FileText, label: "Réservations", href: "/provider/bookings" },
  ],
}

export function Sidebar({ className, isOpen, user }: SidebarProps) {
  const pathname = usePathname()

  const roleMenuItems = user?.role && user.role in menuItems ? menuItems[user.role as keyof typeof menuItems] : []

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn("fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r bg-background", className)}
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <ScrollArea className="h-full py-6">
            <div className="space-y-4 py-4">
              <Accordion.Root type="multiple" className="w-full">
                {Object.entries(menuItems).map(([role, items], index) => {
                  if (user?.role !== role) return null

                  return (
                    <Accordion.Item key={index} value={`section-${index}`}>
                      <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium">
                        {role}
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      </Accordion.Trigger>
                      <Accordion.Content className="px-4 py-2">
                        {items.map((item, itemIndex) => (
                          <Button
                            key={itemIndex}
                            asChild
                            variant={pathname === item.href ? "secondary" : "ghost"}
                            className="w-full justify-start"
                          >
                            <Link href={item.href}>
                              <item.icon className="mr-2 h-4 w-4" />
                              {item.label}
                            </Link>
                          </Button>
                        ))}
                      </Accordion.Content>
                    </Accordion.Item>
                  )
                })}
              </Accordion.Root>
              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Paramètres</h2>
                <div className="space-y-1">
                  <Button
                    asChild
                    variant={pathname === "/settings" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Paramètres
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

