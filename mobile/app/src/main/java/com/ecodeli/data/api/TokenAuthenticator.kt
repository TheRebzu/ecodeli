package me.ecodeli.data.api

import me.ecodeli.data.repositories.AuthRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Authenticator pour gérer le rafraîchissement automatique des tokens
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val authRepository: AuthRepository
) : Authenticator {
    
    override fun authenticate(route: Route?, response: Response): Request? {
        // Si la requête a déjà échoué avec un token rafraîchi, abandonner
        if (response.request.header("Authorization-Retry") != null) {
            return null
        }
        
        // Rafraîchir le token de manière synchrone
        val newToken = runBlocking {
            try {
                authRepository.refreshToken()
                authRepository.getAccessToken().first()
            } catch (e: Exception) {
                // En cas d'échec du refresh, déconnecter l'utilisateur
                authRepository.logout()
                null
            }
        }
        
        // Si pas de nouveau token, abandonner
        if (newToken.isNullOrEmpty()) {
            return null
        }
        
        // Reconstruire la requête avec le nouveau token
        return response.request.newBuilder()
            .header("Authorization", "Bearer $newToken")
            .header("Authorization-Retry", "true")
            .build()
    }
}