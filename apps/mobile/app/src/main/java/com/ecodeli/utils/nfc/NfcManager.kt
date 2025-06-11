package com.ecodeli.utils.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Gestionnaire NFC pour la validation des livraisons
 */
@Singleton
class NfcManager @Inject constructor() {
    
    private var nfcAdapter: NfcAdapter? = null
    private var onNfcTagRead: ((NfcTagData) -> Unit)? = null
    
    companion object {
        private const val TAG = "NfcManager"
    }
    
    /**
     * Initialiser le gestionnaire NFC
     */
    fun initialize(activity: Activity) {
        nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
        if (nfcAdapter == null) {
            Log.w(TAG, "Appareil sans support NFC")
        }
    }
    
    /**
     * Vérifier si le NFC est disponible et activé
     */
    fun isNfcAvailable(): Boolean = nfcAdapter != null
    
    fun isNfcEnabled(): Boolean = nfcAdapter?.isEnabled == true
    
    /**
     * Définir le callback pour la lecture des tags NFC
     */
    fun setOnNfcTagReadListener(listener: (NfcTagData) -> Unit) {
        onNfcTagRead = listener
    }
    
    /**
     * Traiter un tag NFC découvert
     */
    suspend fun handleNfcTag(tag: Tag): NfcTagData? = withContext(Dispatchers.IO) {
        try {
            val tagId = bytesToHex(tag.id)
            
            // Essayer de lire les données NDEF
            val ndefData = readNdefData(tag)
            
            val nfcData = NfcTagData(
                tagId = tagId,
                ndefMessage = ndefData,
                technologies = tag.techList.toList()
            )
            
            // Notifier le listener
            onNfcTagRead?.invoke(nfcData)
            
            nfcData
        } catch (e: Exception) {
            Log.e(TAG, "Erreur lors de la lecture du tag NFC", e)
            null
        }
    }
    
    /**
     * Lire les données NDEF d'un tag
     */
    private fun readNdefData(tag: Tag): String? {
        val ndef = Ndef.get(tag)
        return try {
            ndef?.connect()
            val ndefMessage = ndef?.ndefMessage
            val records = ndefMessage?.records
            
            if (records != null && records.isNotEmpty()) {
                String(records[0].payload, Charsets.UTF_8)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erreur lors de la lecture NDEF", e)
            null
        } finally {
            try {
                ndef?.close()
            } catch (e: Exception) {
                Log.e(TAG, "Erreur lors de la fermeture NDEF", e)
            }
        }
    }
    
    /**
     * Convertir un tableau de bytes en string hexadécimal
     */
    private fun bytesToHex(bytes: ByteArray): String {
        return bytes.joinToString("") { "%02x".format(it) }
    }
    
    /**
     * Valider que le tag NFC correspond à un livreur EcoDeli
     */
    fun validateDelivererTag(nfcData: NfcTagData): ValidationResult {
        return try {
            // Vérifier le format du tag ID (doit être un format spécifique EcoDeli)
            if (!isValidEcoDeliTag(nfcData.tagId)) {
                return ValidationResult.InvalidTag("Format de tag invalide")
            }
            
            // Extraire l'ID du livreur depuis les données NDEF ou le tag ID
            val delivererId = extractDelivererId(nfcData)
            if (delivererId == null) {
                return ValidationResult.InvalidTag("ID livreur introuvable")
            }
            
            // Générer une signature basée sur le tag et l'horodatage
            val signature = generateSignature(nfcData.tagId, System.currentTimeMillis())
            
            ValidationResult.Success(
                delivererId = delivererId,
                signature = signature,
                timestamp = System.currentTimeMillis()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Erreur lors de la validation du tag", e)
            ValidationResult.Error(e.message ?: "Erreur inconnue")
        }
    }
    
    /**
     * Vérifier si le tag correspond au format EcoDeli
     */
    private fun isValidEcoDeliTag(tagId: String): Boolean {
        // Implémentation simplifiée - à adapter selon vos besoins
        return tagId.length >= 8 && tagId.startsWith("ecodeli", ignoreCase = true)
    }
    
    /**
     * Extraire l'ID du livreur depuis les données NFC
     */
    private fun extractDelivererId(nfcData: NfcTagData): String? {
        // Essayer d'abord les données NDEF
        nfcData.ndefMessage?.let { message ->
            if (message.startsWith("ECODELI_DELIVERER:", ignoreCase = true)) {
                return message.substringAfter("ECODELI_DELIVERER:")
            }
        }
        
        // Sinon utiliser le tag ID directement
        return if (isValidEcoDeliTag(nfcData.tagId)) {
            nfcData.tagId.substringAfter("ecodeli")
        } else {
            null
        }
    }
    
    /**
     * Générer une signature pour la validation
     */
    private fun generateSignature(tagId: String, timestamp: Long): String {
        // Implémentation simplifiée - utiliser une vraie cryptographie en production
        val data = "$tagId:$timestamp:ecodeli_secret"
        return data.hashCode().toString(16)
    }
}

/**
 * Données d'un tag NFC
 */
data class NfcTagData(
    val tagId: String,
    val ndefMessage: String?,
    val technologies: List<String>
)

/**
 * Résultat de validation NFC
 */
sealed class ValidationResult {
    data class Success(
        val delivererId: String,
        val signature: String,
        val timestamp: Long
    ) : ValidationResult()
    
    data class InvalidTag(val reason: String) : ValidationResult()
    data class Error(val message: String) : ValidationResult()
}