"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface DeliveryValidationFormProps {
  announcementId: string
  deliveryId: string
  recipientName?: string
  deliveryAddress: string
  onValidationSuccess: (validationData: any) => void
  onValidationError: (error: string) => void
}

export function DeliveryValidationForm({
  announcementId,
  deliveryId,
  recipientName,
  deliveryAddress,
  onValidationSuccess,
  onValidationError
}: DeliveryValidationFormProps) {
  const router = useRouter()
  const [validationCode, setValidationCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent pasting multiple characters

    const newCode = [...validationCode]
    newCode[index] = value.toUpperCase()
    setValidationCode(newCode)

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value && newCode.every(digit => digit)) {
      handleValidation(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !validationCode[index] && index > 0) {
      // Focus previous input on backspace
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('La photo ne doit pas dépasser 5MB')
        return
      }

      setDeliveryPhoto(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const generateValidationCode = async () => {
    try {
      const response = await fetch(`/api/deliverer/deliveries/${deliveryId}/generate-code`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du code')
      }

      // Show success message
      alert('Code de validation envoyé au client par SMS et email')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)
    }
  }

  const handleValidation = async (code: string) => {
    setLoading(true)
    setError(null)

    try {
      // Upload photo if present
      let photoUrl = null
      if (deliveryPhoto) {
        const formData = new FormData()
        formData.append('file', deliveryPhoto)
        formData.append('type', 'delivery_proof')
        formData.append('deliveryId', deliveryId)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          photoUrl = uploadData.url
        }
      }

      // Validate delivery
      const response = await fetch(`/api/deliverer/deliveries/${deliveryId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          validationCode: code,
          photoUrl,
          signature,
          notes: notes.trim() || undefined,
          location: await getCurrentLocation()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Code de validation incorrect')
      }

      onValidationSuccess(data)
      
      // Show success and redirect
      alert('✅ Livraison validée avec succès ! Le paiement va être libéré.')
      router.push('/deliverer/dashboard')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de validation'
      setError(errorMessage)
      onValidationError(errorMessage)
      
      // Clear the code on error
      setValidationCode(['', '', '', '', '', ''])
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus()
      }
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = (): Promise<{latitude: number, longitude: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        () => resolve(null),
        { timeout: 5000 }
      )
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">📦</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Validation de livraison
        </h2>
        <p className="text-gray-600">
          Saisissez le code de validation fourni par le destinataire
        </p>
      </div>

      {/* Delivery Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Informations de livraison</h3>
        <div className="space-y-1 text-sm text-gray-600">
          {recipientName && (
            <p><span className="font-medium">Destinataire:</span> {recipientName}</p>
          )}
          <p><span className="font-medium">Adresse:</span> {deliveryAddress}</p>
        </div>
      </div>

      {/* Generate Code Button */}
      <div className="text-center">
        <button
          onClick={generateValidationCode}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📱 Envoyer le code au destinataire
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Le code sera envoyé par SMS et email au destinataire
        </p>
      </div>

      {/* Validation Code Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
          Code de validation (6 chiffres)
        </label>
        <div className="flex justify-center space-x-2 mb-4">
          {validationCode.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              disabled={loading}
            />
          ))}
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Photo Upload */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Preuve de livraison (optionnel)
          </label>
          <button
            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {showPhotoUpload ? 'Masquer' : 'Ajouter une photo'}
          </button>
        </div>
        
        {showPhotoUpload && (
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            
            {photoPreview && (
              <div className="mt-3">
                <img
                  src={photoPreview}
                  alt="Preuve de livraison"
                  className="w-full max-w-md mx-auto rounded-lg border"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes additionnelles (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Remarques sur la livraison, difficultés rencontrées, etc."
        />
      </div>

      {/* Manual Validation Button */}
      <button
        onClick={() => {
          const code = validationCode.join('')
          if (code.length === 6) {
            handleValidation(code)
          } else {
            setError('Veuillez saisir les 6 chiffres du code de validation')
          }
        }}
        disabled={loading || validationCode.join('').length !== 6}
        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>🔄 Validation en cours...</>
        ) : (
          <>✅ Valider la livraison</>
        )}
      </button>

      {/* Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Aide</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Le destinataire doit vous donner le code de 6 chiffres</li>
          <li>• En cas de problème, contactez le support via l'app</li>
          <li>• La photo de preuve est recommandée pour les colis de valeur</li>
          <li>• Le paiement sera libéré automatiquement après validation</li>
        </ul>
      </div>
    </div>
  )
}