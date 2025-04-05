import { ReactNode } from "react";
import Link from "next/link";
import { Package } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50">
      <header className="w-full p-4 border-b bg-white">
        <div className="container mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <Package className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">EcoDeli</span>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
} 