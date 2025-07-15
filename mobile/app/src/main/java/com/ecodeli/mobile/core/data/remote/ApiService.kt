package com.ecodeli.mobile.core.data.remote

import com.ecodeli.mobile.core.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Authentication
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<User>
    
    @GET("api/auth/session")
    suspend fun getSession(): Response<User>
    
    @POST("api/auth/logout")
    suspend fun logout(): Response<Unit>
    
    // Client Announcements
    @GET("api/client/announcements")
    suspend fun getClientAnnouncements(): Response<AnnouncementResponse>
    
    @POST("api/client/announcements")
    suspend fun createAnnouncement(@Body announcement: Announcement): Response<Announcement>
    
    @GET("api/client/announcements/{id}")
    suspend fun getAnnouncement(@Path("id") id: String): Response<Announcement>
    
    @POST("api/client/announcements/{id}/validate")
    suspend fun validateDelivery(
        @Path("id") id: String,
        @Body validation: DeliveryValidation
    ): Response<Unit>
    
    // Client Deliveries
    @GET("api/client/deliveries")
    suspend fun getClientDeliveries(): Response<List<Delivery>>
    
    @GET("api/client/deliveries/{id}")
    suspend fun getDelivery(@Path("id") id: String): Response<Delivery>
    
    @GET("api/client/deliveries/{id}/tracking")
    suspend fun getDeliveryTracking(@Path("id") id: String): Response<Delivery>
    
    @POST("api/client/deliveries/{id}/validate")
    suspend fun validateDeliveryWithCode(
        @Path("id") id: String,
        @Body validationCode: Map<String, String>
    ): Response<Unit>
    
    // Payments
    @POST("api/client/announcements/{id}/create-payment-intent")
    suspend fun createPaymentIntent(
        @Path("id") announcementId: String
    ): Response<PaymentIntent>
    
    @GET("api/client/payments")
    suspend fun getPayments(): Response<List<Payment>>
    
    @GET("api/client/wallet")
    suspend fun getWallet(): Response<Wallet>
    
    @POST("api/client/wallet/recharge")
    suspend fun rechargeWallet(@Body amount: Map<String, Double>): Response<PaymentIntent>
    
    // Notifications
    @GET("api/client/notifications")
    suspend fun getNotifications(): Response<List<Notification>>
    
    @POST("api/client/notifications/{id}/read")
    suspend fun markNotificationAsRead(@Path("id") id: String): Response<Unit>
    
    @POST("api/push/subscribe")
    suspend fun subscribeToPushNotifications(@Body subscription: Map<String, String>): Response<Unit>
    
    // Profile
    @GET("api/client/profile")
    suspend fun getProfile(): Response<User>
    
    @PUT("api/client/profile")
    suspend fun updateProfile(@Body user: User): Response<User>
    
    // Deliverer specific endpoints
    @GET("api/deliverer/announcements")
    suspend fun getDelivererOpportunities(): Response<List<Announcement>>
    
    @POST("api/deliverer/announcements/{id}/accept")
    suspend fun acceptAnnouncement(@Path("id") id: String): Response<Unit>
    
    @GET("api/deliverer/deliveries")
    suspend fun getDelivererDeliveries(): Response<List<Delivery>>
    
    @POST("api/deliverer/deliveries/{id}/pickup")
    suspend fun confirmPickup(@Path("id") id: String): Response<Delivery>
    
    @POST("api/deliverer/deliveries/{id}/validate")
    suspend fun completeDelivery(
        @Path("id") id: String,
        @Body validation: DeliveryValidation
    ): Response<Unit>
    
    @POST("api/deliverer/deliveries/{id}/generate-code")
    suspend fun generateValidationCode(@Path("id") id: String): Response<Map<String, String>>
    
    // NFC Validation
    @POST("api/client/deliveries/{id}/validate-nfc")
    suspend fun validateDeliveryWithNfc(
        @Path("id") id: String,
        @Body nfcData: Map<String, String>
    ): Response<Unit>
    
    // Payment methods
    @GET("api/client/payments")
    suspend fun getUserPayments(): Response<List<Payment>>
    
    @GET("api/client/wallet")
    suspend fun getUserWallet(): Response<Wallet>
    
    @POST("api/client/payment-methods")
    suspend fun addPaymentMethod(@Body paymentMethod: Map<String, String>): Response<Unit>
    
    @POST("api/client/wallet/recharge")
    suspend fun rechargeWallet(@Body request: Map<String, Double>): Response<Unit>
    
    @POST("api/client/wallet/withdraw")
    suspend fun withdrawFromWallet(@Body request: Map<String, Double>): Response<Unit>
    
    // User profile
    @GET("api/user/profile")
    suspend fun getCurrentUser(): Response<User>
    
    @PUT("api/user/profile")
    suspend fun updateProfile(@Body profile: Map<String, String>): Response<User>
    
    @POST("api/user/profile/avatar")
    suspend fun uploadProfilePicture(@Body avatar: Map<String, String>): Response<User>
}