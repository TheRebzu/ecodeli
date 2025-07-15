package com.ecodeli.mobile.core.data.repository

import com.ecodeli.mobile.core.data.local.PreferencesManager
import com.ecodeli.mobile.core.data.models.*
import com.ecodeli.mobile.core.data.remote.ApiService
import com.ecodeli.mobile.core.utils.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val preferencesManager: PreferencesManager
) {
    
    val currentUser: Flow<User?> = preferencesManager.userData
    val isAuthenticated: Flow<Boolean> = flow {
        preferencesManager.authToken.collect { token ->
            emit(!token.isNullOrEmpty())
        }
    }
    
    suspend fun login(email: String, password: String): Resource<LoginResponse> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                preferencesManager.saveAuthData(
                    loginResponse.token,
                    loginResponse.refreshToken,
                    loginResponse.user
                )
                Resource.Success(loginResponse)
            } else {
                Resource.Error("Login failed: ${response.message()}")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String,
        role: UserRole,
        referralCode: String? = null
    ): Resource<User> {
        return try {
            val response = apiService.register(
                RegisterRequest(
                    email = email,
                    password = password,
                    firstName = firstName,
                    lastName = lastName,
                    phone = phone,
                    role = role,
                    referralCode = referralCode
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Registration failed: ${response.message()}")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun logout(): Resource<Unit> {
        return try {
            apiService.logout()
            preferencesManager.clearAuthData()
            Resource.Success(Unit)
        } catch (e: Exception) {
            // Clear local data even if API call fails
            preferencesManager.clearAuthData()
            Resource.Success(Unit)
        }
    }
    
    suspend fun getSession(): Resource<User> {
        return try {
            val response = apiService.getSession()
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                preferencesManager.updateUser(user)
                Resource.Success(user)
            } else {
                Resource.Error("Failed to get session")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
}