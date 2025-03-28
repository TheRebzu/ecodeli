import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "EcoDeli Admin",
  description: "Back-office administration panel for EcoDeli",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      <AdminSidebar
        className="hidden md:flex"
        links={[
          {
            title: "Dashboard",
            icon: "LayoutDashboard",
            href: "/admin/dashboard",
            variant: "default",
          },
          {
            title: "Users Management",
            icon: "Users",
            variant: "accordion",
            items: [
              {
                title: "Clients",
                href: "/admin/users/clients",
                icon: "User",
              },
              {
                title: "Drivers",
                href: "/admin/users/drivers",
                icon: "Truck",
              },
              {
                title: "Merchants",
                href: "/admin/users/merchants",
                icon: "Store",
              },
              {
                title: "Providers",
                href: "/admin/users/providers",
                icon: "Briefcase",
              },
            ],
          },
          {
            title: "Contracts",
            icon: "FileText",
            href: "/admin/contracts",
            variant: "default",
          },
          {
            title: "Invoices",
            icon: "Receipt",
            href: "/admin/invoices",
            variant: "default",
          },
          {
            title: "Deliveries",
            icon: "Package",
            href: "/admin/deliveries",
            variant: "default",
          },
          {
            title: "Warehouses",
            icon: "Home",
            href: "/admin/warehouses",
            variant: "default",
          },
          {
            title: "Reports",
            icon: "BarChart2",
            href: "/admin/reports",
            variant: "default",
          },
          {
            title: "Settings",
            icon: "Settings",
            href: "/admin/settings",
            variant: "default",
          },
          {
            title: "Storage Boxes",
            icon: "Archive",
            href: "/admin/storage",
            variant: "default",
          },
        ]}
      />
      <main className="flex-1 ml-0 md:ml-64 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
        {children}
        <Toaster />
      </main>
    </div>
  );
} 