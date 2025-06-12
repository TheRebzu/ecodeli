package com.ecodeli.data.repositories

import com.ecodeli.data.api.Result
import com.ecodeli.data.api.TrpcClient
import com.ecodeli.data.api.TrpcRequest
import com.ecodeli.data.models.*
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository pour la gestion des paiements et du portefeuille
 */
@Singleton
class PaymentRepository @Inject constructor(
    private val trpcClient: TrpcClient
) {
    
    /**
     * Récupérer le solde du portefeuille
     */
    suspend fun getWalletBalance(): Result<WalletBalance> {
        return try {
            val response = trpcClient.getWalletBalance(TrpcRequest(Unit))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Récupérer l'historique des transactions
     */
    suspend fun getTransactions(
        type: TransactionType? = null,
        startDate: Date? = null,
        endDate: Date? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<TransactionListOutput> {
        return try {
            val response = trpcClient.getWalletTransactions(
                TrpcRequest(
                    TransactionListInput(type, startDate, endDate, page, limit)
                )
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Créer une intention de paiement Stripe
     */
    suspend fun createPaymentIntent(
        amount: Double,
        description: String,
        paymentMethodId: String? = null
    ): Result<PaymentIntentOutput> {
        return try {
            val response = trpcClient.createPaymentIntent(
                TrpcRequest(
                    CreatePaymentIntentInput(amount, "EUR", description, paymentMethodId)
                )
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Récupérer l'abonnement actuel
     */
    suspend fun getCurrentSubscription(): Result<Subscription> {
        return try {
            val response = trpcClient.getCurrentSubscription(TrpcRequest(Unit))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Mettre à niveau l'abonnement
     */
    suspend fun upgradeSubscription(
        targetPlan: SubscriptionType,
        paymentMethodId: String? = null
    ): Result<Subscription> {
        return try {
            val response = trpcClient.upgradeSubscription(
                TrpcRequest(UpgradeSubscriptionInput(targetPlan, paymentMethodId))
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Récupérer les préférences de notification
     */
    suspend fun getNotificationPreferences(): Result<NotificationPreferences> {
        return try {
            val response = trpcClient.getNotificationPreferences(TrpcRequest(Unit))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Mettre à jour les préférences de notification
     */
    suspend fun updateNotificationPreferences(
        preferences: NotificationPreferences
    ): Result<NotificationPreferences> {
        return try {
            val response = trpcClient.updateNotificationPreferences(
                TrpcRequest(preferences)
            )
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}