package com.ecodeli.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.Body
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Interface Retrofit pour communiquer avec l'API tRPC
 */
interface TrpcClient {
    
    // Authentification
    @POST("api/trpc/auth.login")
    @Headers("Content-Type: application/json")
    suspend fun login(@Body request: TrpcRequest<LoginInput>): TrpcResponse<LoginOutput>
    
    @POST("api/trpc/auth.register")
    @Headers("Content-Type: application/json")
    suspend fun register(@Body request: TrpcRequest<RegisterInput>): TrpcResponse<RegisterOutput>
    
    @POST("api/trpc/auth.logout")
    @Headers("Content-Type: application/json")
    suspend fun logout(@Body request: TrpcRequest<Unit>): TrpcResponse<Unit>
    
    @POST("api/trpc/auth.refreshToken")
    @Headers("Content-Type: application/json")
    suspend fun refreshToken(@Body request: TrpcRequest<RefreshTokenInput>): TrpcResponse<TokenOutput>
    
    // Profil utilisateur
    @POST("api/trpc/user.getProfile")
    @Headers("Content-Type: application/json")
    suspend fun getProfile(@Body request: TrpcRequest<Unit>): TrpcResponse<UserProfile>
    
    @POST("api/trpc/user.updateProfile")
    @Headers("Content-Type: application/json")
    suspend fun updateProfile(@Body request: TrpcRequest<UpdateProfileInput>): TrpcResponse<UserProfile>
    
    // Livraisons
    @POST("api/trpc/delivery.list")
    @Headers("Content-Type: application/json")
    suspend fun getDeliveries(@Body request: TrpcRequest<DeliveryListInput>): TrpcResponse<DeliveryListOutput>
    
    @POST("api/trpc/delivery.getById")
    @Headers("Content-Type: application/json")
    suspend fun getDeliveryById(@Body request: TrpcRequest<GetByIdInput>): TrpcResponse<Delivery>
    
    @POST("api/trpc/delivery.validateWithCode")
    @Headers("Content-Type: application/json")
    suspend fun validateDeliveryWithCode(@Body request: TrpcRequest<ValidateDeliveryInput>): TrpcResponse<Delivery>
    
    @POST("api/trpc/delivery.validateWithNfc")
    @Headers("Content-Type: application/json")
    suspend fun validateDeliveryWithNfc(@Body request: TrpcRequest<ValidateNfcInput>): TrpcResponse<Delivery>
    
    @POST("api/trpc/delivery.rate")
    @Headers("Content-Type: application/json")
    suspend fun rateDelivery(@Body request: TrpcRequest<RateDeliveryInput>): TrpcResponse<Unit>
    
    // Prestations (Services)
    @POST("api/trpc/service.list")
    @Headers("Content-Type: application/json")
    suspend fun getServices(@Body request: TrpcRequest<ServiceListInput>): TrpcResponse<ServiceListOutput>
    
    @POST("api/trpc/service.getById")
    @Headers("Content-Type: application/json")
    suspend fun getServiceById(@Body request: TrpcRequest<GetByIdInput>): TrpcResponse<Service>
    
    @POST("api/trpc/service.book")
    @Headers("Content-Type: application/json")
    suspend fun bookService(@Body request: TrpcRequest<BookServiceInput>): TrpcResponse<ServiceBooking>
    
    @POST("api/trpc/service.cancelBooking")
    @Headers("Content-Type: application/json")
    suspend fun cancelServiceBooking(@Body request: TrpcRequest<CancelBookingInput>): TrpcResponse<Unit>
    
    // Paiements et portefeuille
    @POST("api/trpc/wallet.getBalance")
    @Headers("Content-Type: application/json")
    suspend fun getWalletBalance(@Body request: TrpcRequest<Unit>): TrpcResponse<WalletBalance>
    
    @POST("api/trpc/wallet.getTransactions")
    @Headers("Content-Type: application/json")
    suspend fun getWalletTransactions(@Body request: TrpcRequest<TransactionListInput>): TrpcResponse<TransactionListOutput>
    
    @POST("api/trpc/payment.createPaymentIntent")
    @Headers("Content-Type: application/json")
    suspend fun createPaymentIntent(@Body request: TrpcRequest<CreatePaymentIntentInput>): TrpcResponse<PaymentIntentOutput>
    
    // Notifications
    @POST("api/trpc/notification.getPreferences")
    @Headers("Content-Type: application/json")
    suspend fun getNotificationPreferences(@Body request: TrpcRequest<Unit>): TrpcResponse<NotificationPreferences>
    
    @POST("api/trpc/notification.updatePreferences")
    @Headers("Content-Type: application/json")
    suspend fun updateNotificationPreferences(@Body request: TrpcRequest<NotificationPreferences>): TrpcResponse<NotificationPreferences>
    
    // Abonnements
    @POST("api/trpc/subscription.getCurrent")
    @Headers("Content-Type: application/json")
    suspend fun getCurrentSubscription(@Body request: TrpcRequest<Unit>): TrpcResponse<Subscription>
    
    @POST("api/trpc/subscription.upgrade")
    @Headers("Content-Type: application/json")
    suspend fun upgradeSubscription(@Body request: TrpcRequest<UpgradeSubscriptionInput>): TrpcResponse<Subscription>
}

/**
 * Structure générique pour les requêtes tRPC
 */
@JsonClass(generateAdapter = true)
data class TrpcRequest<T>(
    @Json(name = "0")
    val input: T
)

/**
 * Structure générique pour les réponses tRPC
 */
@JsonClass(generateAdapter = true)
data class TrpcResponse<T>(
    val result: TrpcResult<T>
)

@JsonClass(generateAdapter = true)
data class TrpcResult<T>(
    val data: T
)

// Structures d'erreur tRPC
@JsonClass(generateAdapter = true)
data class TrpcError(
    val error: TrpcErrorDetail
)

@JsonClass(generateAdapter = true)
data class TrpcErrorDetail(
    val message: String,
    val code: String,
    val httpStatus: Int
)