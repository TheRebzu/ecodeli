package com.ecodeli.mobile.core.data.repository

import com.ecodeli.mobile.core.data.models.User
import com.ecodeli.mobile.core.data.remote.ApiService
import com.ecodeli.mobile.core.utils.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    suspend fun getCurrentUser(): Resource<User> {
        return try {
            val response = apiService.getCurrentUser()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Erreur lors de la récupération du profil utilisateur")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
    
    suspend fun updateProfile(name: String, email: String, phone: String): Resource<User> {
        return try {
            val response = apiService.updateProfile(
                mapOf(
                    "name" to name,
                    "email" to email,
                    "phone" to phone
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Erreur lors de la mise à jour du profil")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
    
    suspend fun uploadProfilePicture(imageUri: String): Resource<User> {
        return try {
            val response = apiService.uploadProfilePicture(
                mapOf("avatar" to imageUri)
            )
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Erreur lors du téléchargement de l'image")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Erreur inconnue")
        }
    }
}