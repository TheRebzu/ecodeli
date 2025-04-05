import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/">
            <span className="text-xl font-bold text-primary">EcoDeli</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-6">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/dashboard/orders">Orders</NavLink>
              <NavLink href="/dashboard/profile">Profile</NavLink>
              <NavLink href="/dashboard/settings">Settings</NavLink>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <BellIcon className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Notifications</span>
              </Button>
              <Button variant="outline" size="sm">
                <LogoutIcon className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link 
      href={href}
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary",
        {
          "text-primary": href === "/dashboard",
          "text-gray-600": href !== "/dashboard"
        }
      )}
    >
      {children}
    </Link>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
} 