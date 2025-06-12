package com.ecodeli.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import java.util.Date

// Modèles d'authentification

@JsonClass(generateAdapter = true)
data class LoginInput(
    val email: String,
    val password: String,
    val twoFactorCode: String? = null
)

@JsonClass(generateAdapter = true)
data class LoginOutput(
    val accessToken: String,
    val refreshToken: String,
    val user: UserProfile,
    val requiresTwoFactor: Boolean = false
)

@JsonClass(generateAdapter = true)
data class RegisterInput(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val phone: String,
    val role: UserRole = UserRole.CLIENT,
    val acceptTerms: Boolean
)

@JsonClass(generateAdapter = true)
data class RegisterOutput(
    val user: UserProfile,
    val requiresEmailVerification: Boolean
)

@JsonClass(generateAdapter = true)
data class RefreshTokenInput(
    val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class TokenOutput(
    val accessToken: String,
    val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class UserProfile(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val phone: String?,
    val role: UserRole,
    val profileImageUrl: String?,
    val isEmailVerified: Boolean,
    val isPhoneVerified: Boolean,
    val isActive: Boolean,
    val createdAt: Date,
    val subscription: SubscriptionType,
    val addresses: List<Address> = emptyList()
)

@JsonClass(generateAdapter = true)
data class UpdateProfileInput(
    val firstName: String? = null,
    val lastName: String? = null,
    val phone: String? = null,
    val profileImageUrl: String? = null
)

enum class UserRole {
    @Json(name = "CLIENT")
    CLIENT,
    @Json(name = "MERCHANT")
    MERCHANT,
    @Json(name = "DELIVERER")
    DELIVERER,
    @Json(name = "PROVIDER")
    PROVIDER,
    @Json(name = "ADMIN")
    ADMIN
}

enum class SubscriptionType {
    @Json(name = "FREE")
    FREE,
    @Json(name = "STARTER")
    STARTER,
    @Json(name = "PREMIUM")
    PREMIUM
}

@JsonClass(generateAdapter = true)
data class Address(
    val id: String,
    val label: String,
    val street: String,
    val city: String,
    val postalCode: String,
    val country: String,
    val latitude: Double?,
    val longitude: Double?,
    val isDefault: Boolean = false
)