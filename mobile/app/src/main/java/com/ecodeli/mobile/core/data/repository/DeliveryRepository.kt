package com.ecodeli.mobile.core.data.repository

import com.ecodeli.mobile.core.data.models.Delivery
import com.ecodeli.mobile.core.data.models.DeliveryValidation
import com.ecodeli.mobile.core.data.remote.ApiService
import com.ecodeli.mobile.core.utils.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeliveryRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    suspend fun getClientDeliveries(): Resource<List<Delivery>> {
        return try {
            val response = apiService.getClientDeliveries()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to fetch deliveries")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun getDelivery(id: String): Resource<Delivery> {
        return try {
            val response = apiService.getDelivery(id)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to fetch delivery")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun getDeliveryTracking(id: String): Resource<Delivery> {
        return try {
            val response = apiService.getDeliveryTracking(id)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to fetch tracking info")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun validateDeliveryWithCode(deliveryId: String, code: String): Resource<Unit> {
        return try {
            val response = apiService.validateDeliveryWithCode(
                deliveryId,
                mapOf("validationCode" to code)
            )
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Invalid validation code")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    // Deliverer specific methods
    suspend fun getDelivererDeliveries(): Resource<List<Delivery>> {
        return try {
            val response = apiService.getDelivererDeliveries()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to fetch deliveries")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun confirmPickup(deliveryId: String): Resource<Delivery> {
        return try {
            val response = apiService.confirmPickup(deliveryId)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to confirm pickup")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun completeDelivery(
        deliveryId: String,
        validationCode: String,
        proofUrl: String?
    ): Resource<Unit> {
        return try {
            val validation = DeliveryValidation(
                deliveryId = deliveryId,
                validationCode = validationCode,
                deliveryProofUrl = proofUrl
            )
            val response = apiService.completeDelivery(deliveryId, validation)
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Failed to complete delivery")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun generateValidationCode(deliveryId: String): Resource<String> {
        return try {
            val response = apiService.generateValidationCode(deliveryId)
            if (response.isSuccessful && response.body() != null) {
                val code = response.body()!!["code"] ?: ""
                Resource.Success(code)
            } else {
                Resource.Error("Failed to generate code")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
}