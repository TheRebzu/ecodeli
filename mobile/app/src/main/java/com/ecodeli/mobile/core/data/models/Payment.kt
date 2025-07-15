package com.ecodeli.mobile.core.data.models

import com.google.gson.annotations.SerializedName

data class Payment(
    val id: String,
    val amount: Double,
    val currency: String,
    val status: PaymentStatus,
    val method: PaymentMethod,
    val stripePaymentIntentId: String?,
    val announcementId: String?,
    val deliveryId: String?,
    val userId: String,
    val description: String?,
    val createdAt: String,
    val updatedAt: String
)

enum class PaymentStatus {
    @SerializedName("PENDING")
    PENDING,
    @SerializedName("PROCESSING")
    PROCESSING,
    @SerializedName("SUCCEEDED")
    SUCCEEDED,
    @SerializedName("FAILED")
    FAILED,
    @SerializedName("CANCELLED")
    CANCELLED,
    @SerializedName("REFUNDED")
    REFUNDED
}

enum class PaymentMethod {
    @SerializedName("CARD")
    CARD,
    @SerializedName("WALLET")
    WALLET,
    @SerializedName("BANK_TRANSFER")
    BANK_TRANSFER
}

data class PaymentIntent(
    val clientSecret: String,
    val amount: Double,
    val currency: String
)

data class Wallet(
    val id: String,
    val userId: String,
    val balance: Double,
    val currency: String,
    val transactions: List<WalletTransaction>?
)

data class WalletTransaction(
    val id: String,
    val type: TransactionType,
    val amount: Double,
    val description: String,
    val createdAt: String
)

enum class TransactionType {
    @SerializedName("CREDIT")
    CREDIT,
    @SerializedName("DEBIT")
    DEBIT
}