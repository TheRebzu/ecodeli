// Génère un code de validation à 6 chiffres
export function generateValidationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Génère un numéro de tracking unique
export function generateTrackingNumber(prefix: string = 'ECO'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

// Génère un numéro de commande
export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `CMD-${year}${month}${day}-${random}`
}

// Génère un numéro de facture
export function generateInvoiceNumber(prefix: string = 'FAC'): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const sequence = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${year}-${month}-${sequence}`
}

// Génère un numéro de ticket
export function generateTicketNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(100 + Math.random() * 900)
  return `TIC-${timestamp}-${random}`
}

// Génère un code de parrainage
export function generateReferralCode(userName: string): string {
  const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const prefix = cleanName.substring(0, 4)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${random}`
}

// Génère un numéro de contrat
export function generateContractNumber(merchantName: string): string {
  const date = new Date()
  const year = date.getFullYear()
  const cleanName = merchantName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()
  const random = Math.floor(100 + Math.random() * 900)
  return `CONT-${cleanName}-${year}-${random}`
}

// Génère un identifiant de carte NFC
export function generateNFCCardId(): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  return `NFC-${hex()}${hex()}-${hex()}${hex()}-${hex()}${hex()}`
}

// Génère un code d'accès pour box de stockage
export function generateAccessCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const letter = letters[Math.floor(Math.random() * letters.length)]
  const numbers = Math.floor(1000 + Math.random() * 9000)
  return `${letter}${numbers}`
}

// Génère un numéro de certification
export function generateCertificationNumber(type: string): string {
  const typePrefix = type.substring(0, 3).toUpperCase()
  const year = new Date().getFullYear()
  const sequence = Math.floor(10000 + Math.random() * 90000)
  return `CERT-${typePrefix}-${year}-${sequence}`
}

// Génère une référence de réservation
export function generateBookingReference(): string {
  const date = new Date()
  const year = date.getFullYear().toString().substring(2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(10000 + Math.random() * 90000)
  return `RES-${year}${month}-${random}`
}

// Exporte toutes les fonctions de reference-generator
export * from './reference-generator' 