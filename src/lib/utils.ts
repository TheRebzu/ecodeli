// Utilitaires généraux pour EcoDeli
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Fusion de classes CSS avec Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatage des prix en euros
 */
export function formatPrice(price: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(price)
}

/**
 * Formatage des dates
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric"
  }
  
  return new Intl.DateTimeFormat("fr-FR", { ...defaultOptions, ...options }).format(dateObj)
}

/**
 * Formatage des dates relatives (il y a X temps)
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return "À l'instant"
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? "s" : ""}`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? "s" : ""}`
  }
  
  return formatDate(dateObj)
}

/**
 * Formatage des heures
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(dateObj)
}

/**
 * Génération d'ID uniques
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

/**
 * Génération de codes de validation
 */
export function generateValidationCode(length: number = 6): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Calcul de distance entre deux coordonnées (formule Haversine)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Formatage des tailles de fichier
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Validation d'email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validation de numéro de téléphone français
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[0-9]{8}))$/
  return phoneRegex.test(phone.replace(/\s/g, ""))
}

/**
 * Formatage des numéros de téléphone
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5")
  }
  return phone
}

/**
 * Capitalisation de la première lettre
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Conversion en slug (URL-friendly)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9 -]/g, "") // Garde seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, "-") // Remplace espaces par tirets
    .replace(/-+/g, "-") // Supprime les tirets multiples
    .trim()
}

/**
 * Débounce pour optimiser les appels de fonction
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

/**
 * Throttle pour limiter la fréquence d'appel
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func.apply(null, args)
    }
  }
}

/**
 * Deep clone d'un objet
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === "object") {
    const cloned = {} as { [key: string]: any }
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone((obj as { [key: string]: any })[key])
    })
    return cloned as T
  }
  return obj
}

/**
 * Attendre un délai (pour les tests ou animations)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extraire les initiales d'un nom
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || ""
  const last = lastName?.charAt(0)?.toUpperCase() || ""
  return `${first}${last}` || "U"
}

/**
 * Générer une couleur aléatoire pour les avatars
 */
export function getAvatarColor(str: string): string {
  const colors = [
    "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
    "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Validation de mot de passe fort
 */
export function isStrongPassword(password: string): boolean {
  // Au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return strongRegex.test(password)
}

/**
 * Masquer partiellement un email
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (local.length <= 2) return email
  
  const masked = local.charAt(0) + "*".repeat(local.length - 2) + local.charAt(local.length - 1)
  return `${masked}@${domain}`
}

/**
 * Conversion d'une URL en File object (pour les uploads)
 */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new File([blob], filename, { type: blob.type })
}

/**
 * Vérifier si on est côté client
 */
export function isClient(): boolean {
  return typeof window !== "undefined"
}

/**
 * Obtenir l'URL absolue
 */
export function getAbsoluteUrl(path: string): string {
  if (typeof window !== "undefined") {
    return window.location.origin + path
  }
  
  return process.env.NEXTAUTH_URL + path
}