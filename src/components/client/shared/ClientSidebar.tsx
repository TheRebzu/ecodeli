"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { 
  Home, 
  Package, 
  Truck, 
  Map, 
  Calendar, 
  CreditCard,
  Settings, 
  User, 
  Bell, 
  Wallet, 
  HelpCircle, 
  ChevronRight, 
  Box,
  Store,
  ReceiptText,
  ShoppingBag,
  Menu,
  X
} from "lucide-react";

import { useNotifications } from "@/hooks/client/use-notifications";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | boolean;
  submenu?: {
    title: string;
    href: string;
  }[];
}

export default function ClientSidebar({ userId }: { userId: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { unreadCount } = useNotifications(userId);
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  
  useEffect(() => {
    // Close mobile menu when path changes
    setIsOpen(false);
  }, [pathname]);
  
  const menuItems: MenuItem[] = [
    {
      title: "Tableau de bord",
      href: "/client",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Annonces",
      href: "/client/announcements",
      icon: <ShoppingBag className="h-5 w-5" />,
      submenu: [
        { title: "Mes annonces", href: "/client/announcements" },
        { title: "Créer une annonce", href: "/client/announcements/new" },
      ]
    },
    {
      title: "Mes livraisons",
      href: "/client/deliveries",
      icon: <Truck className="h-5 w-5" />,
    },
    {
      title: "Mes colis",
      href: "/client/packages",
      icon: <Package className="h-5 w-5" />,
    },
    {
      title: "Stockage",
      href: "/client/storage",
      icon: <Box className="h-5 w-5" />,
    },
    {
      title: "Services",
      href: "/client/services",
      icon: <Store className="h-5 w-5" />,
    },
    {
      title: "Suivi en direct",
      href: "/client/tracking",
      icon: <Map className="h-5 w-5" />,
    },
    {
      title: "Réservations",
      href: "/client/bookings",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Facturation",
      href: "/client/billing",
      icon: <ReceiptText className="h-5 w-5" />,
    },
    {
      title: "Abonnement",
      href: "/client/subscription",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Porte-monnaie",
      href: "/client/wallet",
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      title: "Notifications",
      href: "/client/notifications",
      icon: <Bell className="h-5 w-5" />,
      badge: unreadCount,
    },
    {
      title: "Profil",
      href: "/client/profile",
      icon: <User className="h-5 w-5" />,
    },
    {
      title: "Paramètres",
      href: "/client/settings",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      title: "Aide",
      href: "/client/help",
      icon: <HelpCircle className="h-5 w-5" />,
      submenu: [
        { title: "Centre d'aide", href: "/client/help" },
        { title: "Tutoriel interactif", href: "/client/tutorial" },
        { title: "Contactez-nous", href: "/client/help/contact" },
      ]
    },
  ];
  
  const toggleSubmenu = (title: string) => {
    if (openSubmenu === title) {
      setOpenSubmenu(null);
    } else {
      setOpenSubmenu(title);
    }
  };
  
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  
  return (
    <>
      {/* Mobile menu button */}
      <button 
        onClick={() => setIsOpen(true)} 
        className="md:hidden fixed bottom-4 right-4 z-30 p-2 rounded-full bg-blue-600 text-white shadow-lg"
      >
        <Menu className="h-6 w-6" />
      </button>
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:static md:z-0
      `}>
        {/* Close button (mobile only) */}
        <button 
          onClick={() => setIsOpen(false)} 
          className="md:hidden absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Logo & Brand */}
        <div className="p-4 border-b border-gray-200">
          <Link href="/client" className="flex items-center">
            <Image
              src="/images/logo.svg"
              alt="EcoDeli Logo"
              width={32}
              height={32}
              className="mr-2"
            />
            <span className="text-xl font-semibold text-blue-600">EcoDeli</span>
          </Link>
        </div>
        
        {/* User info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {session?.user && 'image' in session.user && typeof session.user.image === 'string' ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                {session?.user?.name || "Utilisateur"}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[180px]">
                {session?.user?.email || ""}
              </p>
            </div>
          </div>
        </div>
        
        {/* Menu Items */}
        <nav className="mt-2 px-2">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.title}>
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.title)}
                      className={`
                        w-full flex items-center justify-between p-2 rounded-md text-sm
                        ${isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-3">{item.icon}</span>
                        <span>{item.title}</span>
                        {typeof item.badge === 'number' && item.badge > 0 && (
                          <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${openSubmenu === item.title ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {openSubmenu === item.title && (
                      <ul className="ml-6 mt-1 space-y-1">
                        {item.submenu.map((subitem) => (
                          <li key={subitem.title}>
                            <Link
                              href={subitem.href}
                              className={`
                                block p-2 rounded-md text-sm
                                ${isActive(subitem.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
                              `}
                            >
                              {subitem.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`
                      flex items-center p-2 rounded-md text-sm
                      ${isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
                    `}
                  >
                    <span className="text-gray-500 mr-3">{item.icon}</span>
                    <span>{item.title}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="ml-auto bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
} 