package me.ecodeli.data.api

import me.ecodeli.data.repositories.AuthRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Intercepteur pour ajouter le token d'authentification aux requêtes
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val authRepository: AuthRepository
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Récupérer le token de manière synchrone
        val token = runBlocking {
            authRepository.getAccessToken().first()
        }
        
        // Si pas de token, continuer sans authentification
        if (token.isNullOrEmpty()) {
            return chain.proceed(originalRequest)
        }
        
        // Ajouter le header Authorization
        val authenticatedRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
            
        return chain.proceed(authenticatedRequest)
    }
}