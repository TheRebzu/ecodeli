import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Package, Truck, Users, Shield, Menu } from "lucide-react";

/**
 * Header pour les utilisateurs non connectés (pages publiques)
 */
export function PublicHeader() {
  const t = useTranslations("navigation");
  const common = useTranslations("common");

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold">EcoDeli</span>
          </Link>

          {/* Navigation principale */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>{t("services")}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <Truck className="h-4 w-4 text-green-600" />
                        <Link href="/services" className="text-sm font-medium">
                          {t("delivery")}
                        </Link>
                      </div>
                      <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <Users className="h-4 w-4 text-blue-600" />
                        <Link href="/services" className="text-sm font-medium">
                          {t("personal_services")}
                        </Link>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/pricing"
                    className="text-sm font-medium px-4 py-2"
                  >
                    {t("pricing")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/about" className="text-sm font-medium px-4 py-2">
                    {t("about")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/become-delivery"
                    className="text-sm font-medium px-4 py-2"
                  >
                    {t("become_deliverer")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />

            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">{common("login")}</Link>
              </Button>
              <Button asChild>
                <Link href="/register">{common("register")}</Link>
              </Button>
            </div>

            {/* Mobile Menu */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
