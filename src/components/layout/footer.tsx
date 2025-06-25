import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Package,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Heart
} from 'lucide-react';

interface FooterProps {
  variant?: 'public' | 'dashboard';
}

/**
 * Footer principal d'EcoDeli
 */
export function Footer({ variant = 'public' }: FooterProps) {
  const t = useTranslations('navigation');
  const common = useTranslations('common');
  const footer = useTranslations('footer');

  if (variant === 'dashboard') {
    return (
      <footer className="border-t bg-muted/30 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span className="font-semibold">EcoDeli</span>
              <span className="text-sm text-muted-foreground">
                © 2024 - {footer('rights_reserved')}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/legal/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                {footer('privacy')}
              </Link>
              <Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground">
                {footer('terms')}
              </Link>
              <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground">
                {common('support')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        {/* Newsletter Section */}
        <div className="bg-green-600 rounded-lg p-8 mb-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              {footer('newsletter_title')}
            </h3>
            <p className="text-green-100 mb-6">
              {footer('newsletter_description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder={footer('email_placeholder')}
                className="bg-white text-gray-900"
              />
              <Button variant="secondary" className="bg-white text-green-600 hover:bg-gray-100">
                {footer('subscribe')}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Package className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-white">EcoDeli</span>
            </div>
            <p className="text-gray-400 mb-4">
              {footer('company_description')}
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-green-600" />
                <span className="text-sm">contact@ecodeli.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-sm">+33 1 23 45 67 89</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm">Paris, France</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-4">{footer('services')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services/delivery" className="text-gray-400 hover:text-white transition-colors">
                  {footer('delivery_service')}
                </Link>
              </li>
              <li>
                <Link href="/services/personal" className="text-gray-400 hover:text-white transition-colors">
                  {footer('personal_services')}
                </Link>
              </li>
              <li>
                <Link href="/become-deliverer" className="text-gray-400 hover:text-white transition-colors">
                  {footer('become_deliverer')}
                </Link>
              </li>
              <li>
                <Link href="/become-merchant" className="text-gray-400 hover:text-white transition-colors">
                  {footer('become_merchant')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  {footer('pricing')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">{footer('company')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  {footer('about_us')}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-gray-400 hover:text-white transition-colors">
                  {footer('careers')}
                </Link>
              </li>
              <li>
                <Link href="/press" className="text-gray-400 hover:text-white transition-colors">
                  {footer('press')}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                  {footer('blog')}
                </Link>
              </li>
              <li>
                <Link href="/investors" className="text-gray-400 hover:text-white transition-colors">
                  {footer('investors')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">{footer('support')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors">
                  {footer('help_center')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  {footer('contact_us')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                  {footer('faq')}
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-gray-400 hover:text-white transition-colors">
                  {footer('terms')}
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors">
                  {footer('privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-700" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">
              © 2024 EcoDeli. {footer('rights_reserved')}
            </span>
            <LanguageSwitcher />
          </div>

          {/* Social Media */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 mr-2">{footer('follow_us')}:</span>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Facebook className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Twitter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Instagram className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Linkedin className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Youtube className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Made with Love */}
        <div className="text-center mt-8 pt-4 border-t border-gray-700">
          <p className="text-gray-500 text-sm flex items-center justify-center space-x-1">
            <span>{footer('made_with')}</span>
            <Heart className="h-4 w-4 text-red-500" />
            <span>{footer('in_france')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
} 