package com.ecodeli.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import java.util.Date

// Modèles pour les paiements et le portefeuille

@JsonClass(generateAdapter = true)
data class WalletBalance(
    val balance: Double,
    val pendingBalance: Double,
    val currency: String = "EUR",
    val lastUpdated: Date
)

@JsonClass(generateAdapter = true)
data class TransactionListInput(
    val type: TransactionType? = null,
    val startDate: Date? = null,
    val endDate: Date? = null,
    val page: Int = 1,
    val limit: Int = 20
)

@JsonClass(generateAdapter = true)
data class TransactionListOutput(
    val transactions: List<Transaction>,
    val total: Int,
    val page: Int,
    val totalPages: Int
)

@JsonClass(generateAdapter = true)
data class Transaction(
    val id: String,
    val type: TransactionType,
    val amount: Double,
    val currency: String,
    val status: TransactionStatus,
    val description: String,
    
    // Référence à l'entité liée
    val referenceType: ReferenceType?,
    val referenceId: String?,
    
    // Informations de paiement
    val paymentMethod: PaymentMethod?,
    val stripePaymentIntentId: String?,
    
    // Solde après transaction
    val balanceAfter: Double,
    
    // Dates
    val createdAt: Date,
    val completedAt: Date?
)

@JsonClass(generateAdapter = true)
data class CreatePaymentIntentInput(
    val amount: Double,
    val currency: String = "EUR",
    val description: String,
    val paymentMethodId: String? = null
)

@JsonClass(generateAdapter = true)
data class PaymentIntentOutput(
    val clientSecret: String,
    val paymentIntentId: String,
    val amount: Double,
    val currency: String,
    val status: String
)

@JsonClass(generateAdapter = true)
data class Subscription(
    val id: String,
    val type: SubscriptionType,
    val status: SubscriptionStatus,
    val startDate: Date,
    val endDate: Date?,
    val nextBillingDate: Date?,
    val price: Double,
    val currency: String,
    val features: SubscriptionFeatures,
    val stripeSubscriptionId: String?
)

@JsonClass(generateAdapter = true)
data class SubscriptionFeatures(
    val maxDeliveriesPerMonth: Int?,
    val maxServiceBookingsPerMonth: Int?,
    val freeDeliveryKm: Int,
    val discountPercentage: Int,
    val prioritySupport: Boolean,
    val nfcValidation: Boolean
)

@JsonClass(generateAdapter = true)
data class UpgradeSubscriptionInput(
    val targetPlan: SubscriptionType,
    val paymentMethodId: String? = null
)

@JsonClass(generateAdapter = true)
data class NotificationPreferences(
    val emailNotifications: Boolean,
    val pushNotifications: Boolean,
    val smsNotifications: Boolean,
    val deliveryUpdates: Boolean,
    val serviceReminders: Boolean,
    val promotionalOffers: Boolean,
    val securityAlerts: Boolean
)

enum class TransactionType {
    @Json(name = "CREDIT")
    CREDIT,
    @Json(name = "DEBIT")
    DEBIT,
    @Json(name = "REFUND")
    REFUND,
    @Json(name = "COMMISSION")
    COMMISSION,
    @Json(name = "SUBSCRIPTION")
    SUBSCRIPTION
}

enum class TransactionStatus {
    @Json(name = "PENDING")
    PENDING,
    @Json(name = "COMPLETED")
    COMPLETED,
    @Json(name = "FAILED")
    FAILED,
    @Json(name = "CANCELLED")
    CANCELLED
}

enum class ReferenceType {
    @Json(name = "DELIVERY")
    DELIVERY,
    @Json(name = "SERVICE")
    SERVICE,
    @Json(name = "SUBSCRIPTION")
    SUBSCRIPTION,
    @Json(name = "WALLET_TOPUP")
    WALLET_TOPUP
}

enum class SubscriptionStatus {
    @Json(name = "ACTIVE")
    ACTIVE,
    @Json(name = "PAST_DUE")
    PAST_DUE,
    @Json(name = "CANCELLED")
    CANCELLED,
    @Json(name = "EXPIRED")
    EXPIRED
}