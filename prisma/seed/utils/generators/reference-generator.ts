// Génère une référence de transaction
export function generateTransactionReference(prefix: string = 'TXN'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// Génère un ID de carte NFC
export function generateNFCCardId(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16).toUpperCase()
  return `${hex()}${hex()}:${hex()}${hex()}:${hex()}${hex()}:${hex()}${hex()}`
}

// Génère un code d'accès pour les box
export function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Génère un numéro de facture
export function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const sequence = Math.floor(1000 + Math.random() * 9000)
  return `FAC-${year}${month}-${sequence}`
}

// Génère un ID de session
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Génère un token API
export function generateApiToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = 'eco_'
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
} 