"use client";

import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  type MobileMenuProps,
  type MenuItem,
} from "@/components/layout/types/layout.types";

export interface MenuItem {
  key: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: MenuItem[];
  onClick?: () => void;
}

export interface MobileMenuProps {
  items: MenuItem[];
  user?: any;
  onClose?: () => void;
  className?: string;
}

export function MobileMenu({
  items,
  user,
  onClose,
  className,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Gérer les clics extérieurs et ESC
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeMenu();
        }
      };

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-mobile-menu]")) {
          closeMenu();
        }
      };

      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  const openMenu = () => setIsOpen(true);
  const closeMenu = () => {
    setIsOpen(false);
    setExpandedItems([]);
    onClose?.();
  };

  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.onClick) {
      item.onClick();
    }
    if (item.href && !item.children) {
      closeMenu();
    }
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.key);
    const IconComponent = item.icon;

    if (hasChildren) {
      return (
        <div
          key={item.key}
          className={cn("border-b border-border last:border-b-0")}
        >
          <button
            onClick={() => toggleExpanded(item.key)}
            className={cn(
              "w-full flex items-center justify-between p-4 text-left transition-colors",
              "hover:bg-muted focus:bg-muted focus:outline-none",
              level > 0 && "pl-8 border-l-2 border-muted-foreground/20",
            )}
          >
            <div className="flex items-center space-x-3">
              {IconComponent && (
                <IconComponent className="h-5 w-5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "font-medium",
                  level > 0 ? "text-sm" : "text-base",
                )}
              >
                {item.label}
              </span>
              {item.badge && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                  {item.badge}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isExpanded && (
            <div className="bg-muted/50">
              {item.children?.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    const content = (
      <div
        className={cn(
          "flex items-center justify-between p-4 transition-colors",
          "hover:bg-muted focus:bg-muted",
          level > 0 && "pl-8 border-l-2 border-muted-foreground/20",
        )}
      >
        <div className="flex items-center space-x-3">
          {IconComponent && (
            <IconComponent className="h-5 w-5 text-muted-foreground" />
          )}
          <span
            className={cn("font-medium", level > 0 ? "text-sm" : "text-base")}
          >
            {item.label}
          </span>
          {item.badge && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
              {item.badge}
            </span>
          )}
        </div>
      </div>
    );

    if (item.href) {
      return (
        <Link
          key={item.key}
          href={item.href}
          onClick={() => handleItemClick(item)}
          className={cn(
            "block border-b border-border last:border-b-0",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
          )}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.key}
        onClick={() => handleItemClick(item)}
        className={cn(
          "w-full text-left border-b border-border last:border-b-0",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
        )}
      >
        {content}
      </button>
    );
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={openMenu}
        className={cn(
          "p-2 rounded-lg transition-colors lg:hidden",
          "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20",
          className,
        )}
        aria-label="Ouvrir le menu"
        data-mobile-menu
      >
        <Menu className="h-6 w-6 text-foreground" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
          {/* Menu Panel */}
          <div
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-background border-r border-border overflow-y-auto"
            data-mobile-menu
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <img
                  src="/logo.svg"
                  alt="EcoDeli"
                  className="h-8 w-8"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="font-bold text-lg text-foreground">
                  EcoDeli
                </span>
              </div>

              <button
                onClick={closeMenu}
                className="p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || user.email}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-medium">
                        {(user.name || user.email || "")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {user.name || "Utilisateur"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                    {user.role && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="py-2">
              {items.map((item) => renderMenuItem(item))}
            </div>

            {/* Footer */}
            <div className="mt-auto p-4 border-t border-border bg-muted/30">
              <div className="text-center text-xs text-muted-foreground">
                <p>EcoDeli © 2024</p>
                <p className="mt-1">Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook pour créer les items de menu selon le rôle
 */
export function useMobileMenuItems(userRole?: string) {
  const baseItems: MenuItem[] = [
    {
      key: "dashboard",
      label: "Tableau de bord",
      href: "/dashboard",
      icon: ({ className }) => (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"
          />
        </svg>
      ),
    },
  ];

  // Ajouter des items selon le rôle
  switch (userRole) {
    case "CLIENT":
      return [
        ...baseItems,
        {
          key: "announcements",
          label: "Mes annonces",
          href: "/client/announcements",
        },
        {
          key: "deliveries",
          label: "Mes livraisons",
          href: "/client/deliveries",
        },
        {
          key: "services",
          label: "Services",
          children: [
            {
              key: "book-service",
              label: "Réserver",
              href: "/client/services",
            },
            {
              key: "my-bookings",
              label: "Mes réservations",
              href: "/client/bookings",
            },
          ],
        },
      ];

    case "DELIVERER":
      return [
        ...baseItems,
        {
          key: "routes",
          label: "Mes trajets",
          href: "/deliverer/routes",
        },
        {
          key: "deliveries",
          label: "Livraisons",
          href: "/deliverer/deliveries",
        },
      ];

    case "ADMIN":
      return [
        ...baseItems,
        {
          key: "users",
          label: "Utilisateurs",
          href: "/admin/users",
        },
        {
          key: "validations",
          label: "Validations",
          href: "/admin/validations",
        },
      ];

    default:
      return baseItems;
  }
}
