package com.ecodeli.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import java.util.Date

// Modèles pour les livraisons

@JsonClass(generateAdapter = true)
data class DeliveryListInput(
    val status: DeliveryStatus? = null,
    val page: Int = 1,
    val limit: Int = 20,
    val sortBy: String = "createdAt",
    val sortOrder: String = "desc"
)

@JsonClass(generateAdapter = true)
data class DeliveryListOutput(
    val deliveries: List<Delivery>,
    val total: Int,
    val page: Int,
    val totalPages: Int
)

@JsonClass(generateAdapter = true)
data class Delivery(
    val id: String,
    val trackingNumber: String,
    val status: DeliveryStatus,
    val type: DeliveryType,
    
    // Informations client
    val clientId: String,
    val clientName: String,
    val clientPhone: String?,
    
    // Informations livreur
    val delivererId: String?,
    val delivererName: String?,
    val delivererPhone: String?,
    val delivererNfcCardId: String?,
    
    // Adresses
    val pickupAddress: DeliveryAddress,
    val deliveryAddress: DeliveryAddress,
    
    // Détails
    val description: String,
    val packageSize: PackageSize,
    val weight: Double?,
    val fragile: Boolean = false,
    val photos: List<String> = emptyList(),
    
    // Validation
    val validationCode: String?,
    val validatedAt: Date?,
    val validationType: ValidationType?,
    
    // Suivi
    val estimatedDeliveryTime: Date?,
    val actualDeliveryTime: Date?,
    val trackingHistory: List<TrackingEvent> = emptyList(),
    
    // Prix et paiement
    val price: Double,
    val isPaid: Boolean,
    val paymentMethod: PaymentMethod?,
    
    // Évaluation
    val rating: Int?,
    val comment: String?,
    
    // Dates
    val createdAt: Date,
    val updatedAt: Date
)

@JsonClass(generateAdapter = true)
data class DeliveryAddress(
    val street: String,
    val city: String,
    val postalCode: String,
    val country: String,
    val latitude: Double?,
    val longitude: Double?,
    val additionalInfo: String? = null,
    val contactName: String? = null,
    val contactPhone: String? = null
)

@JsonClass(generateAdapter = true)
data class TrackingEvent(
    val id: String,
    val status: DeliveryStatus,
    val message: String,
    val location: Location?,
    val createdAt: Date
)

@JsonClass(generateAdapter = true)
data class Location(
    val latitude: Double,
    val longitude: Double,
    val address: String?
)

@JsonClass(generateAdapter = true)
data class ValidateDeliveryInput(
    val deliveryId: String,
    val validationCode: String
)

@JsonClass(generateAdapter = true)
data class ValidateNfcInput(
    val deliveryId: String,
    val nfcCardId: String,
    val nfcSignature: String
)

@JsonClass(generateAdapter = true)
data class RateDeliveryInput(
    val deliveryId: String,
    val rating: Int,
    val comment: String?
)

@JsonClass(generateAdapter = true)
data class GetByIdInput(
    val id: String
)

enum class DeliveryStatus {
    @Json(name = "PENDING")
    PENDING,
    @Json(name = "ACCEPTED")
    ACCEPTED,
    @Json(name = "PICKUP_IN_PROGRESS")
    PICKUP_IN_PROGRESS,
    @Json(name = "IN_TRANSIT")
    IN_TRANSIT,
    @Json(name = "DELIVERED")
    DELIVERED,
    @Json(name = "CANCELLED")
    CANCELLED,
    @Json(name = "FAILED")
    FAILED
}

enum class DeliveryType {
    @Json(name = "STANDARD")
    STANDARD,
    @Json(name = "EXPRESS")
    EXPRESS,
    @Json(name = "SCHEDULED")
    SCHEDULED,
    @Json(name = "FRAGILE")
    FRAGILE
}

enum class PackageSize {
    @Json(name = "SMALL")
    SMALL,
    @Json(name = "MEDIUM")
    MEDIUM,
    @Json(name = "LARGE")
    LARGE,
    @Json(name = "EXTRA_LARGE")
    EXTRA_LARGE
}

enum class ValidationType {
    @Json(name = "CODE")
    CODE,
    @Json(name = "NFC")
    NFC,
    @Json(name = "SIGNATURE")
    SIGNATURE
}

enum class PaymentMethod {
    @Json(name = "WALLET")
    WALLET,
    @Json(name = "CARD")
    CARD,
    @Json(name = "CASH")
    CASH
}