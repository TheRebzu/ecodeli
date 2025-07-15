package com.ecodeli.mobile.core.data.models

import com.google.gson.annotations.SerializedName

data class Delivery(
    val id: String,
    val announcementId: String,
    val announcement: Announcement?,
    val status: DeliveryStatus,
    val trackingCode: String,
    val validationCode: String?,
    val pickupProofUrl: String?,
    val deliveryProofUrl: String?,
    val currentLocation: Location?,
    val estimatedDeliveryTime: String?,
    val actualDeliveryTime: String?,
    val steps: List<DeliveryStep>,
    val createdAt: String,
    val updatedAt: String
)

enum class DeliveryStatus {
    @SerializedName("PENDING_PICKUP")
    PENDING_PICKUP,
    @SerializedName("PICKED_UP")
    PICKED_UP,
    @SerializedName("IN_TRANSIT")
    IN_TRANSIT,
    @SerializedName("DELIVERED")
    DELIVERED,
    @SerializedName("FAILED")
    FAILED,
    @SerializedName("CANCELLED")
    CANCELLED
}

data class Location(
    val latitude: Double,
    val longitude: Double,
    val address: String?,
    val timestamp: String
)

data class DeliveryStep(
    val id: String,
    val type: StepType,
    val status: StepStatus,
    val location: Location?,
    val timestamp: String,
    val note: String?
)

enum class StepType {
    @SerializedName("PICKUP")
    PICKUP,
    @SerializedName("TRANSIT")
    TRANSIT,
    @SerializedName("DELIVERY")
    DELIVERY
}

enum class StepStatus {
    @SerializedName("PENDING")
    PENDING,
    @SerializedName("IN_PROGRESS")
    IN_PROGRESS,
    @SerializedName("COMPLETED")
    COMPLETED
}

data class DeliveryValidation(
    val deliveryId: String,
    val validationCode: String,
    val deliveryProofUrl: String?
)