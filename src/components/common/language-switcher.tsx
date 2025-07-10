'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe, ChevronDown } from 'lucide-react'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const switchLocale = (newLocale: Locale) => {
    // Remove current locale from pathname
    const pathWithoutLocale = pathname.replace(`/${locale}`, '')
    
    // Add new locale to pathname
    const newPath = `/${newLocale}${pathWithoutLocale}`
    
    router.push(newPath)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 min-w-[120px]"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">
            {localeFlags[locale]} {localeNames[locale]}
          </span>
          <span className="sm:hidden">
            {localeFlags[locale]}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {locales.map((localeOption) => (
          <DropdownMenuItem
            key={localeOption}
            onClick={() => switchLocale(localeOption)}
            className={`flex items-center gap-3 cursor-pointer ${
              locale === localeOption ? 'bg-accent' : ''
            }`}
          >
            <span className="text-lg">{localeFlags[localeOption]}</span>
            <span className="flex-1">{localeNames[localeOption]}</span>
            {locale === localeOption && (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Hook personnalisé pour utiliser facilement les formats de locale
export function useLocaleFormat() {
  const locale = useLocale() as Locale
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatRelativeTime = (date: Date) => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    const now = new Date()
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000)
    
    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(diffInSeconds) || 'second'
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(Math.floor(diffInSeconds / 60), 'minute')
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(Math.floor(diffInSeconds / 3600), 'hour')
    } else {
      return rtf.format(Math.floor(diffInSeconds / 86400), 'day')
    }
  }

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat(locale).format(number)
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100)
  }

  return {
    formatCurrency,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    formatPercent
  }
}