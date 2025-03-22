import Link from "next/link";
import { Mail, HelpCircle, FileText, Shield } from "lucide-react";

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/help" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Aide
            </Link>
            <Link href="/dashboard/support" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Support
            </Link>
            <Link href="/legal/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <FileText className="h-3 w-3" />
              CGU
            </Link>
            <Link href="/legal/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Confidentialité
            </Link>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>© {currentYear} EcoDeli</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">Version 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
} 