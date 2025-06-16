package me.ecodeli.data.repositories

import me.ecodeli.data.api.Result
import me.ecodeli.data.api.TrpcClient
import me.ecodeli.data.api.TrpcRequest
import me.ecodeli.data.models.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository pour la gestion des prestations de service
 */
@Singleton
class ServiceRepository @Inject constructor(
    private val trpcClient: TrpcClient
) {
    
    /**
     * Récupérer la liste des services disponibles
     */
    suspend fun getServices(
        category: ServiceCategory? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        radius: Double? = null,
        minPrice: Double? = null,
        maxPrice: Double? = null,
        minRating: Double? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<ServiceListOutput> {
        return try {
            val response = trpcClient.getServices(
                TrpcRequest(
                    ServiceListInput(
                        category = category,
                        latitude = latitude,
                        longitude = longitude,
                        radius = radius,
                        minPrice = minPrice,
                        maxPrice = maxPrice,
                        minRating = minRating,
                        page = page,
                        limit = limit
                    )
                )
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Récupérer un service par ID
     */
    suspend fun getServiceById(serviceId: String): Result<Service> {
        return try {
            val response = trpcClient.getServiceById(
                TrpcRequest(GetByIdInput(serviceId))
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Réserver un service
     */
    suspend fun bookService(input: BookServiceInput): Result<ServiceBooking> {
        return try {
            val response = trpcClient.bookService(TrpcRequest(input))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Annuler une réservation
     */
    suspend fun cancelServiceBooking(
        bookingId: String,
        reason: String
    ): Result<Unit> {
        return try {
            trpcClient.cancelServiceBooking(
                TrpcRequest(CancelBookingInput(bookingId, reason))
            )
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}