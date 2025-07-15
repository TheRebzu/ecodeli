package com.ecodeli.mobile.core.data.models

import com.google.gson.annotations.SerializedName

data class Notification(
    val id: String,
    val title: String,
    val message: String,
    val type: NotificationType,
    val userId: String,
    val isRead: Boolean,
    val data: Map<String, String>?,
    val createdAt: String
)

enum class NotificationType {
    @SerializedName("ANNOUNCEMENT_ACCEPTED")
    ANNOUNCEMENT_ACCEPTED,
    @SerializedName("DELIVERY_UPDATE")
    DELIVERY_UPDATE,
    @SerializedName("PAYMENT_RECEIVED")
    PAYMENT_RECEIVED,
    @SerializedName("VALIDATION_REQUIRED")
    VALIDATION_REQUIRED,
    @SerializedName("NEW_MESSAGE")
    NEW_MESSAGE,
    @SerializedName("SYSTEM")
    SYSTEM
}