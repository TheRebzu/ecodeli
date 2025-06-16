package me.ecodeli.domain.usecases.delivery

import me.ecodeli.data.api.Result
import me.ecodeli.data.models.Delivery
import me.ecodeli.data.repositories.DeliveryRepository
import javax.inject.Inject

/**
 * Use case pour valider une livraison
 */
class ValidateDeliveryUseCase @Inject constructor(
    private val deliveryRepository: DeliveryRepository
) {
    /**
     * Valider avec un code
     */
    suspend fun validateWithCode(
        deliveryId: String,
        validationCode: String
    ): Result<Delivery> {
        if (deliveryId.isBlank()) {
            return Result.Error(IllegalArgumentException("ID de livraison invalide"))
        }
        
        if (validationCode.isBlank() || validationCode.length != 6) {
            return Result.Error(IllegalArgumentException("Code de validation invalide"))
        }
        
        return deliveryRepository.validateDeliveryWithCode(deliveryId, validationCode)
    }
    
    /**
     * Valider avec NFC
     */
    suspend fun validateWithNfc(
        deliveryId: String,
        nfcCardId: String,
        nfcSignature: String
    ): Result<Delivery> {
        if (deliveryId.isBlank()) {
            return Result.Error(IllegalArgumentException("ID de livraison invalide"))
        }
        
        if (nfcCardId.isBlank() || nfcSignature.isBlank()) {
            return Result.Error(IllegalArgumentException("Données NFC invalides"))
        }
        
        return deliveryRepository.validateDeliveryWithNfc(deliveryId, nfcCardId, nfcSignature)
    }
}