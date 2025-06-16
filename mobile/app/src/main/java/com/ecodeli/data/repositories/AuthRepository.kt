package me.ecodeli.data.repositories

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import me.ecodeli.data.api.Result
import me.ecodeli.data.api.TrpcClient
import me.ecodeli.data.api.TrpcRequest
import me.ecodeli.data.models.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository pour la gestion de l'authentification
 */
@Singleton
class AuthRepository @Inject constructor(
    private val trpcClient: TrpcClient,
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        private val KEY_ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
    }
    
    /**
     * Connexion de l'utilisateur
     */
    suspend fun login(email: String, password: String, twoFactorCode: String? = null): Result<LoginOutput> {
        return try {
            val response = trpcClient.login(
                TrpcRequest(LoginInput(email, password, twoFactorCode))
            )
            
            // Sauvegarder les tokens
            saveTokens(response.result.data.accessToken, response.result.data.refreshToken)
            saveUserId(response.result.data.user.id)
            
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Inscription d'un nouvel utilisateur
     */
    suspend fun register(input: RegisterInput): Result<RegisterOutput> {
        return try {
            val response = trpcClient.register(TrpcRequest(input))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Déconnexion de l'utilisateur
     */
    suspend fun logout() {
        try {
            trpcClient.logout(TrpcRequest(Unit))
        } catch (e: Exception) {
            // Ignorer les erreurs de déconnexion côté serveur
        }
        
        // Effacer les données locales
        clearTokens()
    }
    
    /**
     * Rafraîchissement du token d'accès
     */
    suspend fun refreshToken() {
        val refreshToken = getRefreshToken().map { it ?: "" }.first()
        if (refreshToken.isEmpty()) {
            throw Exception("No refresh token available")
        }
        
        try {
            val response = trpcClient.refreshToken(
                TrpcRequest(RefreshTokenInput(refreshToken))
            )
            
            // Sauvegarder les nouveaux tokens
            saveTokens(response.result.data.accessToken, response.result.data.refreshToken)
        } catch (e: Exception) {
            // En cas d'échec, effacer les tokens
            clearTokens()
            throw e
        }
    }
    
    /**
     * Récupérer le profil utilisateur
     */
    suspend fun getProfile(): Result<UserProfile> {
        return try {
            val response = trpcClient.getProfile(TrpcRequest(Unit))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Mettre à jour le profil utilisateur
     */
    suspend fun updateProfile(input: UpdateProfileInput): Result<UserProfile> {
        return try {
            val response = trpcClient.updateProfile(TrpcRequest(input))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
    
    /**
     * Observer le token d'accès
     */
    fun getAccessToken(): Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_ACCESS_TOKEN]
    }
    
    /**
     * Observer le token de rafraîchissement
     */
    fun getRefreshToken(): Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_REFRESH_TOKEN]
    }
    
    /**
     * Observer l'ID utilisateur
     */
    fun getUserId(): Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_USER_ID]
    }
    
    /**
     * Vérifier si l'utilisateur est connecté
     */
    fun isLoggedIn(): Flow<Boolean> = getAccessToken().map { !it.isNullOrEmpty() }
    
    /**
     * Sauvegarder les tokens
     */
    private suspend fun saveTokens(accessToken: String, refreshToken: String) {
        dataStore.edit { preferences ->
            preferences[KEY_ACCESS_TOKEN] = accessToken
            preferences[KEY_REFRESH_TOKEN] = refreshToken
        }
    }
    
    /**
     * Sauvegarder l'ID utilisateur
     */
    private suspend fun saveUserId(userId: String) {
        dataStore.edit { preferences ->
            preferences[KEY_USER_ID] = userId
        }
    }
    
    /**
     * Effacer les tokens
     */
    private suspend fun clearTokens() {
        dataStore.edit { preferences ->
            preferences.remove(KEY_ACCESS_TOKEN)
            preferences.remove(KEY_REFRESH_TOKEN)
            preferences.remove(KEY_USER_ID)
        }
    }
}