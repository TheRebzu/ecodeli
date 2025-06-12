package com.ecodeli.data.repositories

import com.ecodeli.data.api.Result
import com.ecodeli.data.api.TrpcClient
import com.ecodeli.data.api.TrpcRequest
import com.ecodeli.data.models.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository pour la gestion des livraisons
 */
@Singleton
class DeliveryRepository @Inject constructor(
    private val trpcClient: TrpcClient
) {
    
    /**
     * Récupérer la liste des livraisons
     */
    suspend fun getDeliveries(
        status: DeliveryStatus? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<DeliveryListOutput> {
        return try {
            val response = trpcClient.getDeliveries(
                TrpcRequest(DeliveryListInput(status, page, limit))
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Récupérer une livraison par ID
     */
    suspend fun getDeliveryById(deliveryId: String): Result<Delivery> {
        return try {
            val response = trpcClient.getDeliveryById(
                TrpcRequest(GetByIdInput(deliveryId))
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Valider une livraison avec un code
     */
    suspend fun validateDeliveryWithCode(
        deliveryId: String,
        validationCode: String
    ): Result<Delivery> {
        return try {
            val response = trpcClient.validateDeliveryWithCode(
                TrpcRequest(ValidateDeliveryInput(deliveryId, validationCode))
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Valider une livraison avec NFC
     */
    suspend fun validateDeliveryWithNfc(
        deliveryId: String,
        nfcCardId: String,
        nfcSignature: String
    ): Result<Delivery> {
        return try {
            val response = trpcClient.validateDeliveryWithNfc(
                TrpcRequest(ValidateNfcInput(deliveryId, nfcCardId, nfcSignature))
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Évaluer une livraison
     */
    suspend fun rateDelivery(
        deliveryId: String,
        rating: Int,
        comment: String? = null
    ): Result<Unit> {
        return try {
            trpcClient.rateDelivery(
                TrpcRequest(RateDeliveryInput(deliveryId, rating, comment))
            )
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}