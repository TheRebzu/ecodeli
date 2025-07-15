package com.ecodeli.mobile.core.data.models

import com.google.gson.annotations.SerializedName

data class Announcement(
    val id: String,
    val title: String,
    val description: String,
    val type: AnnouncementType,
    val status: AnnouncementStatus,
    val pickupAddress: Address,
    val deliveryAddress: Address,
    val pickupDate: String,
    val deliveryDate: String,
    val price: Double,
    val weight: Double?,
    val dimensions: PackageDimensions?,
    val photoUrl: String?,
    val clientId: String,
    val delivererId: String?,
    val createdAt: String,
    val updatedAt: String
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
    @SerializedName("ACCEPTED")
    ACCEPTED,
    @SerializedName("IN_PROGRESS")
    IN_PROGRESS,
    @SerializedName("COMPLETED")
    COMPLETED,
    @SerializedName("CANCELLED")
    CANCELLED
}

data class Address(
    val street: String,
    val city: String,
    val postalCode: String,
    val country: String,
    val latitude: Double?,
    val longitude: Double?
)

data class PackageDimensions(
    val length: Double,
    val width: Double,
    val height: Double
)