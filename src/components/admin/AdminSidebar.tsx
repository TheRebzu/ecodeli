"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SidebarLink = {
  title: string;
  icon: string;
  href?: string;
  variant: "default" | "accordion";
  items?: { title: string; href: string; icon: string }[];
};

export function AdminSidebar({
  links,
  className,
}: {
  links: SidebarLink[];
  className?: string;
}) {
  const pathname = usePathname();
  
  return (
    <div
      className={cn(
        "flex w-64 flex-col bg-slate-900 text-white h-screen fixed left-0 top-0 overflow-y-auto",
        className
      )}
    >
      <div className="p-4 mb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold">EcoDeli Admin</h2>
      </div>
      <nav className="flex-1">
        <ul className="px-2 py-2 space-y-1">
          {links.map((link, index) => (
            <SidebarItem key={index} link={link} pathname={pathname} />
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700"></div>
          <div>
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-slate-400">admin@ecodeli.me</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  link,
  pathname,
}: {
  link: SidebarLink;
  pathname: string;
}) {
  const [expanded, setExpanded] = useState(
    link.items?.some((item) => pathname.startsWith(item.href)) ?? false
  );

  const Icon = LucideIcons[link.icon as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;

  if (link.variant === "accordion" && link.items?.length) {
    return (
      <li>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full p-2 rounded-md hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5" />}
            <span>{link.title}</span>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", {
              "transform rotate-180": expanded,
            })}
          />
        </button>
        {expanded && (
          <ul className="pl-10 mt-1 space-y-1">
            {link.items.map((item, idx) => {
              const ItemIcon = LucideIcons[item.icon as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
              const isActive = pathname === item.href;
              
              return (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md transition-colors",
                      isActive
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-800/50 text-slate-300"
                    )}
                  >
                    {ItemIcon && <ItemIcon className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  const isActive = pathname === link.href;

  return (
    <li>
      <Link
        href={link.href || "#"}
        className={cn(
          "flex items-center gap-3 p-2 rounded-md transition-colors",
          isActive
            ? "bg-slate-800 text-white"
            : "hover:bg-slate-800/50 text-slate-300"
        )}
      >
        {Icon && <Icon className="h-5 w-5" />}
        <span>{link.title}</span>
      </Link>
    </li>
  );
} 