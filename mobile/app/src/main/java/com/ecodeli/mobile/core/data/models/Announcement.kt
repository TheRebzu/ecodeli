package com.ecodeli.mobile.core.data.models

import com.google.gson.annotations.SerializedName

data class Announcement(
    val id: String,
    val title: String,
    val description: String,
    val type: AnnouncementType?,
    val status: AnnouncementStatus?,
    val pickupAddress: String?,
    val deliveryAddress: String?,
    val pickupDate: String?,
    val deliveryDate: String?,
    val basePrice: Double,
    val finalPrice: Double,
    val currency: String,
    val isPriceNegotiable: Boolean,
    val pickupLatitude: Double?,
    val pickupLongitude: Double?,
    val deliveryLatitude: Double?,
    val deliveryLongitude: Double?,
    val distance: Double?,
    val isFlexibleDate: Boolean,
    val isUrgent: Boolean,
    val requiresInsurance: Boolean,
    val allowsPartialDelivery: Boolean,
    val viewCount: Int,
    val matchCount: Int,
    val estimatedDuration: Int?,
    val specialInstructions: String?,
    val customerNotes: String?,
    val createdAt: String,
    val updatedAt: String,
    val publishedAt: String?,
    val expiresAt: String?,
    val author: AnnouncementAuthor,
    val packageDetails: PackageDetails?
)

enum class AnnouncementType {
    @SerializedName("PACKAGE")
    PACKAGE,
    @SerializedName("PERSON_TRANSPORT")
    PERSON_TRANSPORT,
    @SerializedName("SHOPPING")
    SHOPPING,
    @SerializedName("PET_SITTING")
    PET_SITTING,
    @SerializedName("SERVICE")
    SERVICE,
    @SerializedName("INTERNATIONAL_PURCHASE")
    INTERNATIONAL_PURCHASE
}

enum class AnnouncementStatus {
    @SerializedName("PENDING")
    PENDING,
    @SerializedName("ACTIVE")
    ACTIVE,
    @SerializedName("ACCEPTED")
    ACCEPTED,
    @SerializedName("IN_PROGRESS")
    IN_PROGRESS,
    @SerializedName("COMPLETED")
    COMPLETED,
    @SerializedName("CANCELLED")
    CANCELLED
}

data class AnnouncementAuthor(
    val id: String,
    val name: String,
    val avatar: String?
)

data class PackageDetails(
    val weight: Double?,
    val length: Double?,
    val width: Double?,
    val height: Double?,
    val fragile: Boolean?,
    val insuredValue: Double?,
    val specialInstructions: String?
)

data class AnnouncementResponse(
    val announcements: List<Announcement>,
    val pagination: Pagination,
    val stats: AnnouncementStats
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrev: Boolean
)

data class AnnouncementStats(
    val totalValue: Double,
    val averagePrice: Double
)