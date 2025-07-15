package com.ecodeli.mobile.core.data.repository

import com.ecodeli.mobile.core.data.models.Payment
import com.ecodeli.mobile.core.data.models.Wallet
import com.ecodeli.mobile.core.data.remote.ApiService
import com.ecodeli.mobile.core.utils.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    suspend fun getUserPayments(): Resource<List<Payment>> {
        return try {
            val response = apiService.getUserPayments()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Erreur lors de la récupération des paiements")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
    
    suspend fun getUserWallet(): Resource<Wallet> {
        return try {
            val response = apiService.getUserWallet()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Erreur lors de la récupération du portefeuille")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
    
    suspend fun addPaymentMethod(cardNumber: String, expiryDate: String, cvv: String): Resource<Unit> {
        return try {
            val response = apiService.addPaymentMethod(
                mapOf(
                    "cardNumber" to cardNumber,
                    "expiryDate" to expiryDate,
                    "cvv" to cvv
                )
            )
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Erreur lors de l'ajout de la méthode de paiement")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
    
    suspend fun rechargeWallet(amount: Double): Resource<Unit> {
        return try {
            val response = apiService.rechargeWallet(
                mapOf("amount" to amount)
            )
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Erreur lors de la recharge du portefeuille")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
    
    suspend fun withdrawFromWallet(amount: Double): Resource<Unit> {
        return try {
            val response = apiService.withdrawFromWallet(
                mapOf("amount" to amount)
            )
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Erreur lors du retrait du portefeuille")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
}