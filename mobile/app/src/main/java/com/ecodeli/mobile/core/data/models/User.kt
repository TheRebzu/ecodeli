package com.ecodeli.mobile.core.data.models

import com.google.gson.annotations.SerializedName

data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val phone: String?,
    val avatar: String?,
    val role: UserRole,
    val isValidated: Boolean,
    val createdAt: String,
    val updatedAt: String
)

enum class UserRole {
    @SerializedName("CLIENT")
    CLIENT,
    @SerializedName("DELIVERER")
    DELIVERER,
    @SerializedName("MERCHANT")
    MERCHANT,
    @SerializedName("PROVIDER")
    PROVIDER,
    @SerializedName("ADMIN")
    ADMIN
}

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val user: User,
    val token: String,
    val refreshToken: String
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val phone: String,
    val role: UserRole,
    val referralCode: String? = null
)