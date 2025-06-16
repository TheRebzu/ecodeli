package me.ecodeli.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import java.util.Date

// Modèles pour les prestations de service

@JsonClass(generateAdapter = true)
data class ServiceListInput(
    val category: ServiceCategory? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radius: Double? = null,
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val minRating: Double? = null,
    val page: Int = 1,
    val limit: Int = 20
)

@JsonClass(generateAdapter = true)
data class ServiceListOutput(
    val services: List<Service>,
    val total: Int,
    val page: Int,
    val totalPages: Int
)

@JsonClass(generateAdapter = true)
data class Service(
    val id: String,
    val name: String,
    val description: String,
    val category: ServiceCategory,
    
    // Prestataire
    val providerId: String,
    val providerName: String,
    val providerImageUrl: String?,
    val providerRating: Double,
    val providerReviewCount: Int,
    
    // Prix et durée
    val basePrice: Double,
    val priceUnit: PriceUnit,
    val estimatedDuration: Int, // en minutes
    
    // Disponibilité
    val isAvailable: Boolean,
    val availableSlots: List<TimeSlot> = emptyList(),
    
    // Images et médias
    val images: List<String> = emptyList(),
    
    // Compétences et certifications
    val skills: List<String> = emptyList(),
    val certifications: List<Certification> = emptyList(),
    
    // Localisation
    val serviceArea: ServiceArea?,
    val canTravelToClient: Boolean,
    
    // Métadonnées
    val createdAt: Date,
    val updatedAt: Date
)

@JsonClass(generateAdapter = true)
data class ServiceBooking(
    val id: String,
    val serviceId: String,
    val service: Service,
    val clientId: String,
    val providerId: String,
    
    // Détails de la réservation
    val bookingDate: Date,
    val startTime: String,
    val endTime: String,
    val duration: Int, // en minutes
    
    // Statut
    val status: BookingStatus,
    
    // Localisation
    val address: Address,
    val travelFee: Double?,
    
    // Prix
    val servicePrice: Double,
    val totalPrice: Double,
    val isPaid: Boolean,
    
    // Notes
    val clientNotes: String?,
    val providerNotes: String?,
    
    // Validation et évaluation
    val completedAt: Date?,
    val rating: Int?,
    val review: String?,
    
    // Dates
    val createdAt: Date,
    val updatedAt: Date
)

@JsonClass(generateAdapter = true)
data class BookServiceInput(
    val serviceId: String,
    val bookingDate: Date,
    val startTime: String,
    val duration: Int,
    val addressId: String,
    val notes: String? = null
)

@JsonClass(generateAdapter = true)
data class CancelBookingInput(
    val bookingId: String,
    val reason: String
)

@JsonClass(generateAdapter = true)
data class TimeSlot(
    val date: Date,
    val startTime: String,
    val endTime: String,
    val isAvailable: Boolean
)

@JsonClass(generateAdapter = true)
data class Certification(
    val id: String,
    val name: String,
    val issuer: String,
    val issuedDate: Date,
    val expiryDate: Date?,
    val verified: Boolean
)

@JsonClass(generateAdapter = true)
data class ServiceArea(
    val centerLatitude: Double,
    val centerLongitude: Double,
    val radiusKm: Double
)

enum class ServiceCategory {
    @Json(name = "CLEANING")
    CLEANING,
    @Json(name = "MAINTENANCE")
    MAINTENANCE,
    @Json(name = "GARDENING")
    GARDENING,
    @Json(name = "MOVING")
    MOVING,
    @Json(name = "TUTORING")
    TUTORING,
    @Json(name = "PET_CARE")
    PET_CARE,
    @Json(name = "BEAUTY")
    BEAUTY,
    @Json(name = "HEALTH")
    HEALTH,
    @Json(name = "OTHER")
    OTHER
}

enum class PriceUnit {
    @Json(name = "HOUR")
    HOUR,
    @Json(name = "SERVICE")
    SERVICE,
    @Json(name = "DAY")
    DAY,
    @Json(name = "WEEK")
    WEEK
}

enum class BookingStatus {
    @Json(name = "PENDING")
    PENDING,
    @Json(name = "CONFIRMED")
    CONFIRMED,
    @Json(name = "IN_PROGRESS")
    IN_PROGRESS,
    @Json(name = "COMPLETED")
    COMPLETED,
    @Json(name = "CANCELLED")
    CANCELLED,
    @Json(name = "NO_SHOW")
    NO_SHOW
}